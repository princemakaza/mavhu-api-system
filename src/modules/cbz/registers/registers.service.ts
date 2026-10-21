import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { snapshotOf } from '../../../common/stable-json';
import { AuditTrailService } from '../audit-trail.service';
import { CallerContext } from '../cbz.service';
import { CbzRegisterItem } from '../entities/cbz-register-item.entity';
import { assertCan, assertEntityAccess, isBankWide } from '../role-policy';
import { REGISTERS, RegisterDef } from './register-defs';

@Injectable()
export class RegistersService {
  constructor(
    @InjectRepository(CbzRegisterItem) private readonly items: Repository<CbzRegisterItem>,
    private readonly auditTrail: AuditTrailService,
    private readonly dataSource: DataSource,
  ) {}

  definitions() {
    return REGISTERS;
  }

  private def(key: string): RegisterDef {
    const def = REGISTERS.find((r) => r.key === key);
    if (!def) throw new NotFoundException(`Unknown register '${key}'`);
    return def;
  }

  list(caller: CallerContext, register: string) {
    this.def(register);
    return this.items.find({ where: { bankId: caller.scope.bankId, register }, order: { createdAt: 'ASC' } });
  }

  /** Coerces and checks every field against the register definition; unknown fields are rejected. */
  private validate(def: RegisterDef, input: Record<string, unknown>, partial: boolean): Record<string, unknown> {
    const known = new Set(def.fields.map((f) => f.key));
    const unknown = Object.keys(input).filter((k) => !known.has(k));
    if (unknown.length) throw new BadRequestException(`Unknown field(s) for ${def.label}: ${unknown.join(', ')}`);
    const out: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const field of def.fields) {
      const raw = input[field.key];
      const empty = raw === undefined || raw === null || raw === '';
      if (empty) {
        if (field.required && !partial) errors.push(`${field.label} is required`);
        if (raw !== undefined) out[field.key] = null;
        continue;
      }
      switch (field.type) {
        case 'string':
        case 'text': {
          const text = String(raw).trim();
          if (field.options && !field.options.includes(text)) errors.push(`${field.label} must be one of: ${field.options.filter(Boolean).join(', ')}`);
          else if (text.length > (field.type === 'text' ? 2000 : 255)) errors.push(`${field.label} is too long`);
          else out[field.key] = text;
          break;
        }
        case 'number':
        case 'int':
        case 'score':
        case 'share': {
          const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/[,\s]/g, ''));
          if (!Number.isFinite(num)) errors.push(`${field.label} must be a number`);
          else if ((field.type === 'int' || field.type === 'score') && !Number.isInteger(num)) errors.push(`${field.label} must be a whole number`);
          else if (field.type === 'score' && (num < 1 || num > 5)) errors.push(`${field.label} must be 1 to 5`);
          else if (field.type === 'share' && (num < 0 || num > 1)) errors.push(`${field.label} must be between 0 and 1`);
          else out[field.key] = num;
          break;
        }
        case 'bool':
          out[field.key] = raw === true || raw === 'true' || raw === 'Yes' || raw === 1;
          break;
        case 'date': {
          const text = String(raw).slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) errors.push(`${field.label} must be a date (YYYY-MM-DD)`);
          else out[field.key] = text;
          break;
        }
      }
    }
    if (errors.length) throw new BadRequestException(errors.join('. '));
    return out;
  }

  /**
   * Group-level registers have no subsidiary. In per-subsidiary registers a contributor's entries
   * always belong to their own subsidiary; bank-wide roles may leave an entry at Group level.
   */
  private entityCode(def: RegisterDef, caller: CallerContext, code: unknown): string | null {
    if (!def.entityScoped) return null;
    if (!code || code === 'GROUP') return isBankWide(caller) ? null : caller.entityCode;
    const value = String(code);
    if (!caller.scope.codes.includes(value)) throw new BadRequestException(`${value} is not one of this bank's subsidiaries`);
    assertEntityAccess(caller, value);
    return value;
  }

  /** Contributors may change only their own subsidiary's entries in per-subsidiary registers. */
  private assertCanTouch(def: RegisterDef, caller: CallerContext, item: CbzRegisterItem) {
    if (def.entityScoped) assertEntityAccess(caller, item.entityCode);
  }

  async create(caller: CallerContext, register: string, body: { entityCode?: string | null; data?: Record<string, unknown> }) {
    const def = this.def(register);
    assertCan(caller, def.write, `add to the ${def.label}`);
    const data = this.validate(def, body.data ?? {}, false);
    const entityCode = this.entityCode(def, caller, body.entityCode);
    return this.dataSource.transaction(async (m) => {
      const saved = await m.save(CbzRegisterItem, m.create(CbzRegisterItem, {
        id: `${def.key.slice(0, 3).toUpperCase()}-${randomBytes(5).toString('hex').toUpperCase()}`,
        bankId: caller.scope.bankId,
        register,
        entityCode,
        data,
        createdBy: caller.actorName,
      }));
      await this.auditTrail.record({
        bankId: caller.scope.bankId, actor: caller.actorName, action: 'CREATE', entityCode: entityCode ?? 'GROUP',
        targetType: 'Register', targetId: saved.id, detail: `${def.label}: added ${this.titleOf(def, data)}`, after: snapshotOf(saved),
      }, m);
      return saved;
    });
  }

  async update(caller: CallerContext, register: string, id: string, body: { entityCode?: string | null; data?: Record<string, unknown> }) {
    const def = this.def(register);
    assertCan(caller, def.write, `change the ${def.label}`);
    const patch = this.validate(def, body.data ?? {}, true);
    return this.dataSource.transaction(async (m) => {
      const current = await m.findOne(CbzRegisterItem, { where: { id, register, bankId: caller.scope.bankId } });
      if (!current) throw new NotFoundException(`${def.label} entry ${id} not found`);
      this.assertCanTouch(def, caller, current);
      const before = snapshotOf(current);
      current.data = { ...current.data, ...patch };
      // Required fields cannot be blanked by a partial update.
      this.validate(def, current.data, false);
      if (body.entityCode !== undefined) current.entityCode = this.entityCode(def, caller, body.entityCode);
      current.updatedBy = caller.actorName;
      const saved = await m.save(CbzRegisterItem, current);
      await this.auditTrail.record({
        bankId: caller.scope.bankId, actor: caller.actorName, action: 'UPDATE', entityCode: saved.entityCode ?? 'GROUP',
        targetType: 'Register', targetId: id, detail: `${def.label}: updated ${this.titleOf(def, saved.data)}`, before, after: snapshotOf(saved),
      }, m);
      return saved;
    });
  }

  async remove(caller: CallerContext, register: string, id: string) {
    const def = this.def(register);
    assertCan(caller, 'manage-registers', `delete from the ${def.label}`);
    return this.dataSource.transaction(async (m) => {
      const current = await m.findOne(CbzRegisterItem, { where: { id, register, bankId: caller.scope.bankId } });
      if (!current) throw new NotFoundException(`${def.label} entry ${id} not found`);
      await m.delete(CbzRegisterItem, { id });
      // The deleted content survives in the audit trail.
      await this.auditTrail.record({
        bankId: caller.scope.bankId, actor: caller.actorName, action: 'DELETE', entityCode: current.entityCode ?? 'GROUP',
        targetType: 'Register', targetId: id, detail: `${def.label}: removed ${this.titleOf(def, current.data)}`, before: snapshotOf(current),
      }, m);
      return { id, deleted: true };
    });
  }

  private titleOf(def: RegisterDef, data: Record<string, unknown>): string {
    return String(data[def.fields[0].key] ?? def.label).slice(0, 120);
  }
}
