import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { MAVHU_ADMIN_ROLE, readTokenIdentity } from '../../common/auth/token-identity';
import { AppConfig } from '../../config/configuration';
import { Bank } from '../banks/entities/bank.entity';
import { CbzAuditLog } from './entities/cbz-audit-log.entity';
import { CbzCounterparty } from './entities/cbz-counterparty.entity';
import { CbzDepartment } from './entities/cbz-department.entity';
import { CbzEntity } from './entities/cbz-entity.entity';
import { CbzEsgEmission } from './entities/cbz-esg-emission.entity';
import { CbzFinancedPosition } from './entities/cbz-financed-position.entity';
import { CbzFinancialInclusion } from './entities/cbz-financial-inclusion.entity';
import { CbzGeospatial } from './entities/cbz-geospatial.entity';
import { CbzIncident } from './entities/cbz-incident.entity';
import { CbzIngestionBatch } from './entities/cbz-ingestion-batch.entity';
import { CbzInsurancePolicy } from './entities/cbz-insurance-policy.entity';
import { CbzMember } from './entities/cbz-member.entity';
import { CbzReportingPeriod } from './entities/cbz-reporting-period.entity';
import { CbzRiskEntry } from './entities/cbz-risk-entry.entity';
import { CbzWorkforce } from './entities/cbz-workforce.entity';

/** What the caller sent that decides which bank's data they see. */
export interface ScopeInput {
  authorization?: string;
  bankId?: string;
}

/** The bank a request is confined to, and that bank's subsidiary codes. */
export interface BankScope {
  bankId: number;
  codes: string[];
}

export interface CallerContext {
  scope: BankScope;
  actorName: string;
  /** Bank member id, or null for a MAvHU admin (who is not a cbz_members row). */
  memberId: string | null;
  /** Member role, or 'mavhu-admin'. */
  role: string;
  /** The member's own subsidiary; null for a MAvHU admin. */
  entityCode: string | null;
}

@Injectable()
export class CbzService {
  constructor(
    @InjectRepository(Bank) private banks: Repository<Bank>,
    @InjectRepository(CbzEntity) private entities: Repository<CbzEntity>,
    @InjectRepository(CbzDepartment) private departments: Repository<CbzDepartment>,
    @InjectRepository(CbzMember) private members: Repository<CbzMember>,
    @InjectRepository(CbzCounterparty) private counterparties: Repository<CbzCounterparty>,
    @InjectRepository(CbzFinancedPosition) private financedPositions: Repository<CbzFinancedPosition>,
    @InjectRepository(CbzEsgEmission) private emissions: Repository<CbzEsgEmission>,
    @InjectRepository(CbzInsurancePolicy) private insurance: Repository<CbzInsurancePolicy>,
    @InjectRepository(CbzFinancialInclusion) private financialInclusion: Repository<CbzFinancialInclusion>,
    @InjectRepository(CbzWorkforce) private workforce: Repository<CbzWorkforce>,
    @InjectRepository(CbzIncident) private incidents: Repository<CbzIncident>,
    @InjectRepository(CbzRiskEntry) private risks: Repository<CbzRiskEntry>,
    @InjectRepository(CbzGeospatial) private geospatial: Repository<CbzGeospatial>,
    @InjectRepository(CbzIngestionBatch) private ingestion: Repository<CbzIngestionBatch>,
    @InjectRepository(CbzAuditLog) private audit: Repository<CbzAuditLog>,
    @InjectRepository(CbzReportingPeriod) private periods: Repository<CbzReportingPeriod>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<{ jwt: AppConfig['jwt'] }, true>,
  ) {}

  // ── Bank scoping ──────────────────────────────────────────────────────────
  /**
   * Every bank, CBZ included, is an isolated tenant. A bank member is always confined to their
   * own bank (any ?bankId= is ignored). Only a MAvHU admin may pick a bank, with ?bankId=.
   * Requests without a valid token get nothing.
   */
  async scope(input: ScopeInput): Promise<BankScope> {
    return (await this.resolveCaller(input)).scope;
  }

  /** Who is calling and which bank they act on. Also used by the bulk importer for permissions. */
  async resolveCaller(input: ScopeInput): Promise<CallerContext> {
    const identity = readTokenIdentity(this.jwtService, input.authorization);
    if (!identity) throw new UnauthorizedException('Sign in to see your bank\'s data');

    if (identity.kind === 'member') {
      const member = await this.members.findOne({ where: { id: identity.memberId } });
      if (!member || !member.isActive) throw new UnauthorizedException('This account has been deactivated');
      const entity = await this.entities.findOne({ where: { code: member.entityCode } });
      if (!entity) throw new UnauthorizedException('Your account is no longer linked to a bank');
      const bank = await this.banks.findOne({ where: { id: entity.bankId } });
      if (!bank || bank.isDeleted) throw new UnauthorizedException('Your bank is no longer on the platform');
      if (bank.status === 'suspended') throw new ForbiddenException(`${bank.name}'s access is suspended. Contact the MAvHU team.`);
      return {
        scope: await this.scopeFor(entity.bankId),
        actorName: member.fullName,
        memberId: member.id,
        role: member.role,
        entityCode: member.entityCode,
      };
    }

    if (!identity.roles.includes(MAVHU_ADMIN_ROLE)) {
      throw new ForbiddenException('Only bank users and MAvHU administrators can read bank data');
    }
    const bankId = Number(input.bankId);
    if (!input.bankId || !Number.isInteger(bankId)) {
      throw new BadRequestException('MAvHU administrators must choose a bank with ?bankId=');
    }
    if (!(await this.banks.exists({ where: { id: bankId, isDeleted: false } }))) throw new NotFoundException(`Bank ${bankId} not found`);
    return { scope: await this.scopeFor(bankId), actorName: `${identity.email} (MAvHU)`, memberId: null, role: 'mavhu-admin', entityCode: null };
  }

  private async scopeFor(bankId: number): Promise<BankScope> {
    const rows = await this.entities.find({ where: { bankId }, select: { code: true } });
    return { bankId, codes: rows.map((row) => row.code) };
  }

  private assertInScope(scope: BankScope, code: string | null | undefined) {
    if (!code || !scope.codes.includes(code)) {
      throw new ForbiddenException(`Subsidiary ${code ?? '(none)'} does not belong to this bank`);
    }
  }

  async getBank(scope: BankScope) {
    const bank = await this.banks.findOne({ where: { id: scope.bankId } });
    if (!bank) throw new NotFoundException(`Bank ${scope.bankId} not found`);
    return { id: bank.id, name: bank.name, identifier: bank.identifier, country: bank.country, status: bank.status, modules: bank.modules };
  }

  // ── Reporting periods ─────────────────────────────────────────────────────
  /** A monthly period ("2026-08") is also covered by its quarter ("2026-Q3") being locked. */
  private async assertPeriodOpen(entityCode: string, period: string) {
    const entity = await this.entities.findOne({ where: { code: entityCode } });
    if (!entity) throw new NotFoundException(`Subsidiary ${entityCode} not found`);
    const candidates = [period];
    const month = /^(\d{4})-(\d{2})$/.exec(period);
    if (month) candidates.push(`${month[1]}-Q${Math.ceil(Number(month[2]) / 3)}`);
    const locked = await this.periods.findOne({ where: { bankId: entity.bankId, period: In(candidates), status: 'locked' } });
    if (locked) {
      throw new ForbiddenException(`Reporting period ${locked.period} is locked. Ask a MAvHU administrator to reopen it.`);
    }
  }

  getPeriods(scope: BankScope) {
    return this.periods.find({ where: { bankId: scope.bankId }, order: { period: 'DESC' } });
  }

  // ── Entities ──────────────────────────────────────────────────────────────
  getEntities(scope: BankScope) { return this.entities.find({ where: { bankId: scope.bankId }, order: { name: 'ASC' } }); }

  // ── Departments ───────────────────────────────────────────────────────────
  getDepartments(scope: BankScope) {
    return scope.codes.length ? this.departments.find({ where: { entityCode: In(scope.codes) }, order: { name: 'ASC' } }) : [];
  }

  async addDepartment(scope: BankScope, dto: Partial<CbzDepartment>) {
    this.assertInScope(scope, dto.entityCode);
    const entity = this.departments.create({ id: randomUUID(), ...dto });
    return this.departments.save(entity);
  }

  // ── Members ───────────────────────────────────────────────────────────────
  async addMember(scope: BankScope, dto: Partial<CbzMember> & { password?: string }) {
    this.assertInScope(scope, dto.entityCode);
    const { password, ...rest } = dto;
    const passwordHash = await bcrypt.hash(password ?? 'cbz-demo', 10);
    const entity = this.members.create({ id: randomUUID(), ...rest, email: rest.email?.toLowerCase().trim(), passwordHash });
    const saved = await this.members.save(entity);
    const { passwordHash: _, ...safe } = saved;
    return safe;
  }

  async getMembers(scope: BankScope) {
    if (!scope.codes.length) return [];
    const rows = await this.members.find({ where: { entityCode: In(scope.codes) }, order: { fullName: 'ASC' } });
    return rows.map(({ passwordHash: _, ...safe }) => safe);
  }

  async login(email: string, password: string) {
    const member = await this.members.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!member) throw new UnauthorizedException('Invalid email or password');
    const match = await bcrypt.compare(password, member.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid email or password');
    if (!member.isActive) throw new UnauthorizedException('This account has been deactivated');
    const entity = await this.entities.findOne({ where: { code: member.entityCode } });
    const bank = entity && (await this.banks.findOne({ where: { id: entity.bankId } }));
    if (bank?.status === 'suspended') throw new UnauthorizedException(`${bank.name}'s access is suspended. Contact the MAvHU team.`);
    const { passwordHash: _, ...safe } = member;
    const token = this.jwtService.sign(
      { sub: member.id, email: member.email, role: member.role },
      { expiresIn: this.configService.get('jwt', { infer: true }).expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );
    return { member: safe, token };
  }

  // ── Counterparties ────────────────────────────────────────────────────────
  getCounterparties(scope: BankScope) {
    return scope.codes.length ? this.counterparties.find({ where: { subsidiary: In(scope.codes) }, order: { name: 'ASC' } }) : [];
  }

  async addCounterparty(scope: BankScope, dto: Partial<CbzCounterparty>) {
    this.assertInScope(scope, dto.subsidiary);
    const entity = this.counterparties.create({ id: randomUUID(), ...dto });
    return this.counterparties.save(entity);
  }

  // ── Financed positions ────────────────────────────────────────────────────
  async getFinancedPositions(scope: BankScope) {
    const owned = await this.getCounterparties(scope);
    if (!owned.length) return [];
    return this.financedPositions.find({ where: { counterpartyId: In(owned.map((cp) => cp.id)) }, order: { period: 'ASC' } });
  }

  async addFinancedPosition(scope: BankScope, dto: Partial<CbzFinancedPosition>) {
    const counterparty = await this.counterparties.findOne({ where: { id: dto.counterpartyId ?? '' } });
    this.assertInScope(scope, counterparty?.subsidiary);
    const entity = this.financedPositions.create({ id: randomUUID(), ...dto });
    return this.financedPositions.save(entity);
  }

  // ── ESG Emissions ─────────────────────────────────────────────────────────
  getEmissions(scope: BankScope) {
    return scope.codes.length ? this.emissions.find({ where: { entityCode: In(scope.codes) }, order: { period: 'ASC' } }) : [];
  }

  /** The submitter is always the signed-in member (null for a MAvHU admin), never taken from the body. */
  async addEmission(caller: CallerContext, dto: Partial<CbzEsgEmission>) {
    this.assertInScope(caller.scope, dto.entityCode);
    if (dto.entityCode && dto.period) await this.assertPeriodOpen(dto.entityCode, dto.period);
    const entity = this.emissions.create({
      id: randomUUID(),
      submittedAt: new Date(),
      status: 'draft',
      ...dto,
      submittedBy: caller.memberId,
      approvedBy: null,
      approvedAt: null,
    });
    return this.emissions.save(entity);
  }

  /** The approver is the signed-in member (null for a MAvHU admin, whose action is in the audit trail). */
  async advanceEmissionStatus(caller: CallerContext, id: string) {
    const actorId = caller.memberId;
    const record = await this.emissions.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Emission ${id} not found`);
    this.assertInScope(caller.scope, record.entityCode);
    await this.assertPeriodOpen(record.entityCode, record.period);
    const flow = ['draft', 'in_review', 'approved', 'locked'] as const;
    const idx = flow.indexOf(record.status as (typeof flow)[number]);
    if (idx < 0 || idx === flow.length - 1) return record;
    const next = flow[idx + 1];
    record.status = next;
    if (next === 'approved' || next === 'locked') {
      record.approvedBy = actorId;
      record.approvedAt = new Date();
    }
    return this.emissions.save(record);
  }

  // ── Insurance ─────────────────────────────────────────────────────────────
  getInsurance(scope: BankScope) {
    return scope.codes.length ? this.insurance.find({ where: { subsidiary: In(scope.codes) }, order: { clientName: 'ASC' } }) : [];
  }

  async addInsurance(scope: BankScope, dto: Partial<CbzInsurancePolicy>) {
    this.assertInScope(scope, dto.subsidiary);
    const entity = this.insurance.create({ id: randomUUID(), ...dto });
    return this.insurance.save(entity);
  }

  // ── Financial inclusion ───────────────────────────────────────────────────
  getFinancialInclusion(scope: BankScope) {
    return scope.codes.length ? this.financialInclusion.find({ where: { subsidiary: In(scope.codes) }, order: { period: 'ASC' } }) : [];
  }

  // ── Workforce ─────────────────────────────────────────────────────────────
  getWorkforce(scope: BankScope) {
    return scope.codes.length ? this.workforce.find({ where: { subsidiary: In(scope.codes) }, order: { subsidiary: 'ASC', period: 'ASC' } }) : [];
  }

  // ── Incidents ─────────────────────────────────────────────────────────────
  getIncidents(scope: BankScope) {
    return scope.codes.length ? this.incidents.find({ where: { subsidiary: In(scope.codes) }, order: { dateReported: 'DESC' } }) : [];
  }

  async addIncident(scope: BankScope, dto: Partial<CbzIncident>) {
    this.assertInScope(scope, dto.subsidiary);
    const entity = this.incidents.create({ id: randomUUID(), ...dto });
    return this.incidents.save(entity);
  }

  // ── Risks ─────────────────────────────────────────────────────────────────
  getRisks(scope: BankScope) { return this.risks.find({ where: { bankId: scope.bankId }, order: { category: 'ASC' } }); }

  async addRisk(scope: BankScope, dto: Partial<CbzRiskEntry>) {
    if (dto.linkedEntity !== 'GROUP') this.assertInScope(scope, dto.linkedEntity);
    const entity = this.risks.create({ id: randomUUID(), ...dto, bankId: scope.bankId });
    return this.risks.save(entity);
  }

  // ── Geospatial ────────────────────────────────────────────────────────────
  getGeospatial(scope: BankScope) {
    return scope.codes.length ? this.geospatial.find({ where: { subsidiary: In(scope.codes) }, order: { passDate: 'DESC' } }) : [];
  }

  // ── Ingestion ─────────────────────────────────────────────────────────────
  getIngestion(scope: BankScope) {
    return scope.codes.length ? this.ingestion.find({ where: { subsidiary: In(scope.codes) }, order: { uploadedAt: 'DESC' } }) : [];
  }

  async addIngestionBatch(scope: BankScope, dto: Partial<CbzIngestionBatch>) {
    this.assertInScope(scope, dto.subsidiary);
    const entity = this.ingestion.create({ id: randomUUID(), uploadedAt: new Date(), ...dto });
    return this.ingestion.save(entity);
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  getAudit(scope: BankScope) { return this.audit.find({ where: { bankId: scope.bankId }, order: { timestamp: 'DESC' } }); }

  async appendAudit(scope: BankScope, dto: Partial<CbzAuditLog>) {
    const entry = this.audit.create({ id: randomUUID(), timestamp: new Date(), ...dto, bankId: scope.bankId });
    return this.audit.save(entry);
  }
}
