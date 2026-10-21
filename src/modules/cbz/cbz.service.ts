import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { MAVHU_ADMIN_ROLE, PLATFORM_AUDITOR_ROLE, readTokenIdentity } from '../../common/auth/token-identity';
import { snapshotOf } from '../../common/stable-json';
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
import { AuditTrailService } from './audit-trail.service';
import { assertCan, assertEntityAccess, capabilitiesOf, ROLE_LABELS } from './role-policy';

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
  /** Member role, or 'mavhu-admin' / 'platform-auditor'. */
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
    private readonly auditTrail: AuditTrailService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Bank scoping ──────────────────────────────────────────────────────────
  /**
   * Every bank, CBZ included, is an isolated tenant. A bank member is always confined to their
   * own bank (any ?bankId= is ignored). Only MAvHU staff may pick a bank, with ?bankId=:
   * administrators read and write, MAvHU auditors only read. No token gets nothing.
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

    const isAdmin = identity.roles.includes(MAVHU_ADMIN_ROLE);
    const isAuditor = identity.roles.includes(PLATFORM_AUDITOR_ROLE) && identity.orgType === 'PLATFORM';
    if (!isAdmin && !isAuditor) {
      throw new ForbiddenException('Only bank users and MAvHU staff can read bank data');
    }
    const bankId = Number(input.bankId);
    if (!input.bankId || !Number.isInteger(bankId)) {
      throw new BadRequestException('MAvHU staff must choose a bank with ?bankId=');
    }
    if (!(await this.banks.exists({ where: { id: bankId, isDeleted: false } }))) throw new NotFoundException(`Bank ${bankId} not found`);
    return isAdmin
      ? { scope: await this.scopeFor(bankId), actorName: `${identity.email} (MAvHU)`, memberId: null, role: 'mavhu-admin', entityCode: null }
      : { scope: await this.scopeFor(bankId), actorName: `${identity.email} (MAvHU auditor)`, memberId: null, role: 'platform-auditor', entityCode: null };
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

  /** Writes a change and its audit entry in one transaction, so neither can exist without the other. */
  private inTransaction<T>(work: (m: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }

  private recordAudit(m: EntityManager, caller: CallerContext, action: string, targetType: string, targetId: string | null, detail: string, entityCode: string | null, before: object | null, after: object | null) {
    return this.auditTrail.record(
      { bankId: caller.scope.bankId, actor: caller.actorName, action, entityCode, targetType, targetId, detail, before: snapshotOf(before), after: snapshotOf(after) },
      m,
    );
  }

  /** The signed-in user's role and what it allows, so the UI can show only what will work. */
  me(caller: CallerContext) {
    return {
      actorName: caller.actorName,
      memberId: caller.memberId,
      role: caller.role,
      roleLabel: ROLE_LABELS[caller.role] ?? caller.role,
      entityCode: caller.entityCode,
      bankId: caller.scope.bankId,
      capabilities: capabilitiesOf(caller),
    };
  }

  async getBank(scope: BankScope) {
    const bank = await this.banks.findOne({ where: { id: scope.bankId } });
    if (!bank) throw new NotFoundException(`Bank ${scope.bankId} not found`);
    return { id: bank.id, name: bank.name, identifier: bank.identifier, country: bank.country, status: bank.status, modules: bank.modules };
  }

  // ── Reporting periods ─────────────────────────────────────────────────────
  /** A monthly period ("2026-08") is also covered by its quarter ("2026-Q3") or year being locked. */
  private async assertPeriodOpen(entityCode: string, period: string) {
    const entity = await this.entities.findOne({ where: { code: entityCode } });
    if (!entity) throw new NotFoundException(`Subsidiary ${entityCode} not found`);
    const candidates = [period];
    const month = /^(\d{4})-(\d{2})$/.exec(period);
    if (month) candidates.push(`${month[1]}-Q${Math.ceil(Number(month[2]) / 3)}`, month[1]);
    const quarter = /^(\d{4})-Q[1-4]$/.exec(period);
    if (quarter) candidates.push(quarter[1]);
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

  async addDepartment(caller: CallerContext, dto: Partial<CbzDepartment>) {
    assertCan(caller, 'manage-members', 'add departments');
    this.assertInScope(caller.scope, dto.entityCode);
    return this.inTransaction(async (m) => {
      const saved = await m.save(CbzDepartment, m.create(CbzDepartment, { ...dto, id: randomUUID() }));
      await this.recordAudit(m, caller, 'CREATE', 'Department', saved.id, `Added department ${saved.name}`, saved.entityCode, null, saved);
      return saved;
    });
  }

  // ── Members ───────────────────────────────────────────────────────────────
  async addMember(caller: CallerContext, dto: Partial<CbzMember> & { password?: string }) {
    assertCan(caller, 'manage-members', 'add members');
    this.assertInScope(caller.scope, dto.entityCode);
    const { password, ...rest } = dto;
    const passwordHash = await bcrypt.hash(password ?? 'cbz-demo', 10);
    return this.inTransaction(async (m) => {
      const saved = await m.save(CbzMember, m.create(CbzMember, { ...rest, id: randomUUID(), email: rest.email?.toLowerCase().trim(), passwordHash, isActive: true }));
      await this.recordAudit(m, caller, 'CREATE', 'Member', saved.id, `Added ${saved.fullName} as ${saved.role}`, saved.entityCode, null, saved);
      const { passwordHash: _, ...safe } = saved;
      return safe;
    });
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
    if (bank) {
      await this.auditTrail.record({ bankId: bank.id, actor: member.fullName, action: 'LOGIN', entityCode: member.entityCode, targetType: 'Auth', targetId: member.id, detail: `Signed in as ${member.role}` });
    }
    return { member: safe, token };
  }

  // ── Counterparties ────────────────────────────────────────────────────────
  getCounterparties(scope: BankScope) {
    return scope.codes.length ? this.counterparties.find({ where: { subsidiary: In(scope.codes) }, order: { name: 'ASC' } }) : [];
  }

  async addCounterparty(caller: CallerContext, dto: Partial<CbzCounterparty>) {
    assertCan(caller, 'write-data', 'add counterparties');
    this.assertInScope(caller.scope, dto.subsidiary);
    assertEntityAccess(caller, dto.subsidiary);
    return this.inTransaction(async (m) => {
      const saved = await m.save(CbzCounterparty, m.create(CbzCounterparty, { ...dto, id: randomUUID() }));
      await this.recordAudit(m, caller, 'CREATE', 'Counterparty', saved.id, `Added counterparty ${saved.name}`, saved.subsidiary, null, saved);
      return saved;
    });
  }

  /** Sustainable-finance tagging of an instrument (F22/F33). */
  async tagCounterparty(caller: CallerContext, id: string, dto: { taxonomy?: string | null; taxonomyCategory?: string | null; taxonomyStatus?: string | null }) {
    assertCan(caller, 'tag-taxonomy', 'tag instruments against a taxonomy');
    const TAXONOMIES = ['AfDB', 'ICMA GBP', 'ICMA SBP', 'ICMA SLBP', 'Zimbabwe Green Taxonomy'];
    const STATUSES = ['Eligible', 'Aligned', 'Not eligible', 'Under review'];
    if (dto.taxonomy && !TAXONOMIES.includes(dto.taxonomy)) throw new BadRequestException(`Taxonomy must be one of: ${TAXONOMIES.join(', ')}`);
    if (dto.taxonomyStatus && !STATUSES.includes(dto.taxonomyStatus)) throw new BadRequestException(`Status must be one of: ${STATUSES.join(', ')}`);
    return this.inTransaction(async (m) => {
      const current = await m.findOne(CbzCounterparty, { where: { id } });
      if (!current) throw new NotFoundException(`Counterparty ${id} not found`);
      this.assertInScope(caller.scope, current.subsidiary);
      const before = { ...current };
      current.taxonomy = dto.taxonomy ?? null;
      current.taxonomyCategory = dto.taxonomy ? (dto.taxonomyCategory?.trim() || null) : null;
      current.taxonomyStatus = dto.taxonomy ? (dto.taxonomyStatus ?? 'Under review') : null;
      const saved = await m.save(CbzCounterparty, current);
      await this.recordAudit(m, caller, 'UPDATE', 'Counterparty', id, `Taxonomy tag: ${saved.taxonomy ?? 'removed'}${saved.taxonomyStatus ? ` (${saved.taxonomyStatus})` : ''}`, saved.subsidiary, before, saved);
      return saved;
    });
  }

  // ── Financed positions ────────────────────────────────────────────────────
  async getFinancedPositions(scope: BankScope) {
    const owned = await this.getCounterparties(scope);
    if (!owned.length) return [];
    return this.financedPositions.find({ where: { counterpartyId: In(owned.map((cp) => cp.id)) }, order: { period: 'ASC' } });
  }

  async addFinancedPosition(caller: CallerContext, dto: Partial<CbzFinancedPosition>) {
    assertCan(caller, 'write-data', 'add financed positions');
    const counterparty = await this.counterparties.findOne({ where: { id: dto.counterpartyId ?? '' } });
    this.assertInScope(caller.scope, counterparty?.subsidiary);
    assertEntityAccess(caller, counterparty?.subsidiary);
    if (dto.period) await this.assertPeriodOpen(counterparty!.subsidiary, dto.period);
    return this.inTransaction(async (m) => {
      const saved = await m.save(CbzFinancedPosition, m.create(CbzFinancedPosition, { ...dto, id: randomUUID() }));
      await this.recordAudit(m, caller, 'CREATE', 'Counterparty', saved.id, `Financed position of ${saved.outstandingAmountUsd} USD for ${counterparty!.name}`, counterparty!.subsidiary, null, saved);
      return saved;
    });
  }

  // ── ESG Emissions ─────────────────────────────────────────────────────────
  getEmissions(scope: BankScope) {
    return scope.codes.length ? this.emissions.find({ where: { entityCode: In(scope.codes) }, order: { period: 'ASC' } }) : [];
  }

  /** The submitter is always the signed-in member (null for a MAvHU admin), never taken from the body. */
  async addEmission(caller: CallerContext, dto: Partial<CbzEsgEmission>) {
    assertCan(caller, 'submit-data', 'submit emissions data');
    this.assertInScope(caller.scope, dto.entityCode);
    assertEntityAccess(caller, dto.entityCode);
    if (dto.entityCode && dto.period) await this.assertPeriodOpen(dto.entityCode, dto.period);
    return this.inTransaction(async (m) => {
      const saved = await m.save(CbzEsgEmission, m.create(CbzEsgEmission, {
        submittedAt: new Date(),
        ...dto,
        id: randomUUID(),
        status: 'draft',
        submittedBy: caller.memberId,
        approvedBy: null,
        approvedAt: null,
        reviewNote: null,
      }));
      await this.recordAudit(m, caller, 'CREATE', 'EmissionRecord', saved.id, `Draft ${saved.scope} ${saved.datasetType} for ${saved.period}`, saved.entityCode, null, saved);
      return saved;
    });
  }

  /**
   * draft → in_review → approved → locked (F19). Segregation of duties: whoever submitted a
   * record can never approve it, and only approvers/admins can approve or lock.
   */
  async advanceEmissionStatus(caller: CallerContext, id: string) {
    return this.inTransaction(async (m) => {
      const record = await m.findOne(CbzEsgEmission, { where: { id } });
      if (!record) throw new NotFoundException(`Emission ${id} not found`);
      this.assertInScope(caller.scope, record.entityCode);
      await this.assertPeriodOpen(record.entityCode, record.period);
      const before = { ...record };
      let action: string;
      if (record.status === 'draft') {
        assertCan(caller, 'submit-data', 'submit records for review');
        assertEntityAccess(caller, record.entityCode);
        record.status = 'in_review';
        record.reviewNote = null;
        action = 'SUBMIT';
      } else if (record.status === 'in_review') {
        assertCan(caller, 'approve', 'approve records');
        if (caller.memberId && record.submittedBy === caller.memberId) {
          throw new ForbiddenException('Segregation of duties: you submitted this record, so another approver must approve it');
        }
        record.status = 'approved';
        record.approvedBy = caller.memberId;
        record.approvedAt = new Date();
        action = 'APPROVE';
      } else if (record.status === 'approved') {
        assertCan(caller, 'approve', 'lock records');
        record.status = 'locked';
        action = 'LOCK';
      } else {
        return record;
      }
      const saved = await m.save(CbzEsgEmission, record);
      await this.recordAudit(m, caller, action, 'EmissionRecord', id, `${before.status} → ${saved.status}`, saved.entityCode, before, saved);
      return saved;
    });
  }

  /** An approver sends a record back to draft with a reason the submitter sees. */
  async rejectEmission(caller: CallerContext, id: string, reason: string) {
    assertCan(caller, 'approve', 'reject records');
    if (!reason?.trim()) throw new BadRequestException('Give a reason so the submitter knows what to fix');
    return this.inTransaction(async (m) => {
      const record = await m.findOne(CbzEsgEmission, { where: { id } });
      if (!record) throw new NotFoundException(`Emission ${id} not found`);
      this.assertInScope(caller.scope, record.entityCode);
      if (record.status !== 'in_review') throw new BadRequestException('Only records in review can be sent back');
      const before = { ...record };
      record.status = 'draft';
      record.reviewNote = reason.trim().slice(0, 1000);
      const saved = await m.save(CbzEsgEmission, record);
      await this.recordAudit(m, caller, 'REJECT', 'EmissionRecord', id, `Sent back: ${saved.reviewNote}`, saved.entityCode, before, saved);
      return saved;
    });
  }

  // ── Insurance ─────────────────────────────────────────────────────────────
  getInsurance(scope: BankScope) {
    return scope.codes.length ? this.insurance.find({ where: { subsidiary: In(scope.codes) }, order: { clientName: 'ASC' } }) : [];
  }

  async addInsurance(caller: CallerContext, dto: Partial<CbzInsurancePolicy>) {
    assertCan(caller, 'write-data', 'bind insurance policies');
    this.assertInScope(caller.scope, dto.subsidiary);
    assertEntityAccess(caller, dto.subsidiary);
    return this.inTransaction(async (m) => {
      const saved = await m.save(CbzInsurancePolicy, m.create(CbzInsurancePolicy, { ...dto, id: randomUUID() }));
      await this.recordAudit(m, caller, 'CREATE', 'InsurancePolicy', saved.id, `Bound ${saved.segment} policy for ${saved.clientName}`, saved.subsidiary, null, saved);
      return saved;
    });
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

  async addIncident(caller: CallerContext, dto: Partial<CbzIncident>) {
    assertCan(caller, 'write-data', 'report incidents');
    this.assertInScope(caller.scope, dto.subsidiary);
    assertEntityAccess(caller, dto.subsidiary);
    return this.inTransaction(async (m) => {
      const saved = await m.save(CbzIncident, m.create(CbzIncident, { ...dto, id: randomUUID() }));
      await this.recordAudit(m, caller, 'CREATE', 'Incident', saved.id, `Reported ${saved.severity} ${saved.category} incident`, saved.subsidiary, null, saved);
      return saved;
    });
  }

  /** Move an incident through to closure (F27). */
  async updateIncident(caller: CallerContext, id: string, dto: { status?: string; correctiveAction?: string; closureDate?: string | null }) {
    assertCan(caller, 'write-data', 'update incidents');
    const STATUSES = ['Open', 'In Progress', 'Closed'];
    if (dto.status && !STATUSES.includes(dto.status)) throw new BadRequestException(`Status must be one of: ${STATUSES.join(', ')}`);
    return this.inTransaction(async (m) => {
      const current = await m.findOne(CbzIncident, { where: { id } });
      if (!current) throw new NotFoundException(`Incident ${id} not found`);
      this.assertInScope(caller.scope, current.subsidiary);
      assertEntityAccess(caller, current.subsidiary);
      const before = { ...current };
      if (dto.status) current.status = dto.status;
      if (dto.correctiveAction !== undefined) current.correctiveAction = dto.correctiveAction.trim();
      if (dto.closureDate !== undefined) current.closureDate = dto.closureDate || null;
      if (current.status === 'Closed' && !current.closureDate) current.closureDate = new Date().toISOString().slice(0, 10);
      if (current.status !== 'Closed') current.closureDate = null;
      const saved = await m.save(CbzIncident, current);
      await this.recordAudit(m, caller, 'UPDATE', 'Incident', id, `${before.status} → ${saved.status}`, saved.subsidiary, before, saved);
      return saved;
    });
  }

  // ── Risks ─────────────────────────────────────────────────────────────────
  getRisks(scope: BankScope) { return this.risks.find({ where: { bankId: scope.bankId }, order: { category: 'ASC' } }); }

  async addRisk(caller: CallerContext, dto: Partial<CbzRiskEntry>) {
    assertCan(caller, 'write-data', 'add risks');
    if (dto.linkedEntity !== 'GROUP') {
      this.assertInScope(caller.scope, dto.linkedEntity);
      assertEntityAccess(caller, dto.linkedEntity);
    } else {
      assertCan(caller, 'manage-registers', 'add Group-level risks');
    }
    return this.inTransaction(async (m) => {
      const saved = await m.save(CbzRiskEntry, m.create(CbzRiskEntry, { ...dto, id: randomUUID(), bankId: caller.scope.bankId }));
      await this.recordAudit(m, caller, 'CREATE', 'RiskEntry', saved.id, `Added ${saved.category} risk: ${saved.title}`, saved.linkedEntity, null, saved);
      return saved;
    });
  }

  /** Re-rate or progress a risk (F29/F30): the heat map moves with it. */
  async updateRisk(caller: CallerContext, id: string, dto: { likelihood?: number; impact?: number; status?: string; owner?: string }) {
    assertCan(caller, 'write-data', 'update risks');
    const STATUSES = ['Identified', 'Mitigating', 'Monitoring', 'Closed'];
    for (const [key, value] of [['likelihood', dto.likelihood], ['impact', dto.impact]] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 5)) throw new BadRequestException(`${key} must be 1 to 5`);
    }
    if (dto.status && !STATUSES.includes(dto.status)) throw new BadRequestException(`Status must be one of: ${STATUSES.join(', ')}`);
    return this.inTransaction(async (m) => {
      const current = await m.findOne(CbzRiskEntry, { where: { id, bankId: caller.scope.bankId } });
      if (!current) throw new NotFoundException(`Risk ${id} not found`);
      if (current.linkedEntity !== 'GROUP') assertEntityAccess(caller, current.linkedEntity);
      const before = { ...current };
      Object.assign(current, {
        ...(dto.likelihood !== undefined ? { likelihood: dto.likelihood } : {}),
        ...(dto.impact !== undefined ? { impact: dto.impact } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.owner?.trim() ? { owner: dto.owner.trim() } : {}),
      });
      const saved = await m.save(CbzRiskEntry, current);
      await this.recordAudit(m, caller, 'UPDATE', 'RiskEntry', id, `${saved.title}: L${before.likelihood}×I${before.impact} → L${saved.likelihood}×I${saved.impact}, ${saved.status}`, saved.linkedEntity, before, saved);
      return saved;
    });
  }

  // ── Geospatial ────────────────────────────────────────────────────────────
  getGeospatial(scope: BankScope) {
    return scope.codes.length ? this.geospatial.find({ where: { subsidiary: In(scope.codes) }, order: { passDate: 'DESC' } }) : [];
  }

  // ── MRV-linked borrowers (A3-A6) ──────────────────────────────────────────
  /** For each borrower linked to a MAvHU MRV customer: satellite trend, carbon stock and field verification. */
  async getMrv(scope: BankScope) {
    if (!scope.codes.length) return [];
    return this.dataSource.query(
      `
      SELECT cp.id AS "counterpartyId", cp.name, cp.subsidiary, cp.dq_score AS "dqScore", c.id AS "customerId",
             sum(e.hectares)::int AS hectares, count(DISTINCT e.id)::int AS estates,
             latest.date AS "latestPass", round(latest.ndvi, 3)::float AS "latestNdvi", round(latest.co2)::float AS "carbonStockTco2",
             round(recent.ndvi, 3)::float AS "avgNdvi12m", round(prior.ndvi, 3)::float AS "avgNdviPrior12m",
             round(recent.low, 3)::float AS "lowestNdvi12m",
             (SELECT status FROM mavhu.agri_field_verifications v WHERE v.customer_id = c.id ORDER BY visit_date DESC LIMIT 1) AS "verificationStatus",
             (SELECT max(visit_date) FROM mavhu.agri_field_verifications v WHERE v.customer_id = c.id) AS "lastVisit",
             (SELECT round(coalesce(sum(ton_co2e), 0), 1)::float FROM mavhu.emissions_accounting ea WHERE ea.customer_id = c.id AND ea.approved) AS "approvedFarmTco2e",
             (SELECT coalesce(sum(fp.outstanding_amount_usd), 0)::float FROM mavhu.cbz_financed_positions fp WHERE fp.counterparty_id = cp.id) AS "outstandingUsd"
      FROM mavhu.cbz_counterparties cp
      JOIN mavhu.customers c ON c.id = cp.customer_id
      JOIN mavhu.estates e ON e.customer_id = c.id
      -- Latest pass, then the last 12 months against the 12 before: seasonality cancels out, so a
      -- drought or degradation shows as a fall in the 12-month mean (vulnerability signal, A6).
      LEFT JOIN LATERAL (
        SELECT s.date, avg(s.ndvi_max) AS ndvi, sum(s.net_co2_stock) AS co2 FROM mavhu.satellite_ndvi_co2 s
        WHERE s.customer_id = c.id AND s.date = (SELECT max(date) FROM mavhu.satellite_ndvi_co2 WHERE customer_id = c.id) GROUP BY s.date
      ) latest ON TRUE
      LEFT JOIN LATERAL (
        SELECT avg(s.ndvi_max) AS ndvi, min(s.ndvi_max) AS low FROM mavhu.satellite_ndvi_co2 s
        WHERE s.customer_id = c.id AND s.date > latest.date - interval '365 days'
      ) recent ON TRUE
      LEFT JOIN LATERAL (
        SELECT avg(s.ndvi_max) AS ndvi FROM mavhu.satellite_ndvi_co2 s
        WHERE s.customer_id = c.id AND s.date <= latest.date - interval '365 days' AND s.date > latest.date - interval '730 days'
      ) prior ON TRUE
      WHERE cp.subsidiary = ANY($1)
      GROUP BY cp.id, c.id, latest.date, latest.ndvi, latest.co2, recent.ndvi, recent.low, prior.ndvi
      ORDER BY cp.name
      `,
      [scope.codes],
    );
  }

  // ── Ingestion ─────────────────────────────────────────────────────────────
  getIngestion(scope: BankScope) {
    return scope.codes.length ? this.ingestion.find({ where: { subsidiary: In(scope.codes) }, order: { uploadedAt: 'DESC' } }) : [];
  }

  async addIngestionBatch(caller: CallerContext, dto: Partial<CbzIngestionBatch>) {
    assertCan(caller, 'submit-data', 'log ingestion batches');
    this.assertInScope(caller.scope, dto.subsidiary);
    return this.inTransaction(async (m) => {
      const saved = await m.save(CbzIngestionBatch, m.create(CbzIngestionBatch, { uploadedAt: new Date(), ...dto, id: randomUUID() }));
      await this.recordAudit(m, caller, 'CREATE', 'Ingestion', saved.id, `Logged batch ${saved.fileName}`, saved.subsidiary, null, saved);
      return saved;
    });
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  getAudit(scope: BankScope) { return this.audit.find({ where: { bankId: scope.bankId }, order: { seq: 'DESC' }, take: 2000 }); }

  verifyAudit(scope: BankScope) { return this.auditTrail.verify(scope.bankId); }

  /** A free-text note on the trail; the actor is always the signed-in user, never the body. */
  async appendAudit(caller: CallerContext, dto: Partial<CbzAuditLog>) {
    assertCan(caller, 'submit-data', 'add notes to the audit trail');
    return this.auditTrail.record({
      bankId: caller.scope.bankId,
      actor: caller.actorName,
      action: (dto.action ?? 'NOTE').toString().slice(0, 50),
      entityCode: dto.entityCode ?? null,
      targetType: (dto.targetType ?? 'Note').toString(),
      targetId: dto.targetId ?? null,
      detail: (dto.detail ?? '').toString().slice(0, 2000),
    });
  }
}
