import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { In, QueryFailedError, Repository } from 'typeorm';
import { MAVHU_ADMIN_ROLE } from '../../common/auth/token-identity';
import { Bank } from '../banks/entities/bank.entity';
import { CbzAuditLog } from '../cbz/entities/cbz-audit-log.entity';
import { CbzDepartment } from '../cbz/entities/cbz-department.entity';
import { CbzEntity } from '../cbz/entities/cbz-entity.entity';
import { CbzMember } from '../cbz/entities/cbz-member.entity';
import { CbzReportingPeriod } from '../cbz/entities/cbz-reporting-period.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { User } from '../users/entities/user.entity';
import {
  AdminCreateBankDto,
  AdminCreateMemberDto,
  AdminUpdateBankDto,
  AdminUpdateMemberDto,
  CreateEntityDto,
  CreateTeamMemberDto,
  DASHBOARD_MODULES,
  SetPeriodDto,
  UpdateTeamMemberDto,
} from './dto/admin.dto';

export interface AdminActor {
  userId: number;
  email: string;
}

const SALT_ROUNDS = 10;

/** Postgres unique_violation → 409 with a readable message instead of a 500. */
function rethrowUnique(err: unknown, message: string): never {
  if (err instanceof QueryFailedError && (err.driverError as { code?: string })?.code === '23505') {
    throw new ConflictException(message);
  }
  throw err;
}

@Injectable()
export class PlatformAdminService {
  constructor(
    @InjectRepository(Bank) private banks: Repository<Bank>,
    @InjectRepository(CbzEntity) private entities: Repository<CbzEntity>,
    @InjectRepository(CbzDepartment) private departments: Repository<CbzDepartment>,
    @InjectRepository(CbzMember) private members: Repository<CbzMember>,
    @InjectRepository(CbzAuditLog) private audit: Repository<CbzAuditLog>,
    @InjectRepository(CbzReportingPeriod) private periods: Repository<CbzReportingPeriod>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Role) private roles: Repository<Role>,
    @InjectRepository(UserRole) private userRoles: Repository<UserRole>,
    @InjectRepository(Customer) private customers: Repository<Customer>,
  ) {}

  private async log(actor: AdminActor, action: string, targetType: string, targetId: string | null, detail: string, bankId: number | null, entityCode: string | null = null) {
    await this.audit.save(
      this.audit.create({
        id: randomUUID(),
        timestamp: new Date(),
        actor: `${actor.email} (MAvHU)`,
        action,
        entityCode,
        targetType,
        targetId,
        detail,
        bankId,
      }),
    );
  }

  // ── Overview ──────────────────────────────────────────────────────────────
  /** One row per bank with the KPIs the MAvHU team tracks across clients. */
  async bankStats() {
    const rows: Array<Record<string, unknown>> = await this.banks.query(`
      SELECT b.id, b.name, b.country, b.email, b.phone_number AS "phoneNumber", b.identifier, b.status, b.modules,
             b.created_at AS "createdAt",
             COALESCE(e.entities, 0)::int            AS "entities",
             COALESCE(m.members, 0)::int             AS "members",
             COALESCE(m.active_members, 0)::int      AS "activeMembers",
             COALESCE(em.records, 0)::int            AS "emissionRecords",
             COALESCE(em.drafts, 0)::int             AS "drafts",
             COALESCE(em.in_review, 0)::int          AS "inReview",
             COALESCE(em.signed_off, 0)::int         AS "signedOff",
             COALESCE(em.tco2e, 0)::float            AS "operationalTco2e",
             em.avg_dq::float                        AS "avgDataQuality",
             COALESCE(cp.counterparties, 0)::int     AS "counterparties",
             COALESCE(fp.exposure, 0)::float         AS "financedExposureUsd",
             COALESCE(inc.open_incidents, 0)::int    AS "openIncidents",
             COALESCE(r.risks, 0)::int               AS "risks",
             COALESCE(r.high_risks, 0)::int          AS "highRisks",
             COALESCE(p.locked, 0)::int              AS "lockedPeriods",
             a.last_activity                         AS "lastActivity"
      FROM mavhu.banks b
      LEFT JOIN (SELECT bank_id, count(*) AS entities FROM mavhu.cbz_entities GROUP BY bank_id) e ON e.bank_id = b.id
      LEFT JOIN (
        SELECT en.bank_id, count(*) AS members, count(*) FILTER (WHERE mb.is_active) AS active_members
        FROM mavhu.cbz_members mb JOIN mavhu.cbz_entities en ON en.code = mb.entity_code GROUP BY en.bank_id
      ) m ON m.bank_id = b.id
      LEFT JOIN (
        SELECT en.bank_id, count(*) AS records,
               count(*) FILTER (WHERE x.status = 'draft') AS drafts,
               count(*) FILTER (WHERE x.status = 'in_review') AS in_review,
               count(*) FILTER (WHERE x.status IN ('approved', 'locked')) AS signed_off,
               sum(x.emissions_tco2e) AS tco2e, avg(x.data_quality) AS avg_dq
        FROM mavhu.cbz_esg_emissions x JOIN mavhu.cbz_entities en ON en.code = x.entity_code GROUP BY en.bank_id
      ) em ON em.bank_id = b.id
      LEFT JOIN (
        SELECT en.bank_id, count(*) AS counterparties
        FROM mavhu.cbz_counterparties c JOIN mavhu.cbz_entities en ON en.code = c.subsidiary GROUP BY en.bank_id
      ) cp ON cp.bank_id = b.id
      LEFT JOIN (
        SELECT en.bank_id, sum(f.outstanding_amount_usd) AS exposure
        FROM mavhu.cbz_financed_positions f
        JOIN mavhu.cbz_counterparties c ON c.id = f.counterparty_id
        JOIN mavhu.cbz_entities en ON en.code = c.subsidiary GROUP BY en.bank_id
      ) fp ON fp.bank_id = b.id
      LEFT JOIN (
        SELECT en.bank_id, count(*) FILTER (WHERE i.status <> 'Closed') AS open_incidents
        FROM mavhu.cbz_incidents i JOIN mavhu.cbz_entities en ON en.code = i.subsidiary GROUP BY en.bank_id
      ) inc ON inc.bank_id = b.id
      LEFT JOIN (
        SELECT bank_id, count(*) AS risks, count(*) FILTER (WHERE likelihood * impact >= 12) AS high_risks
        FROM mavhu.cbz_risk_entries GROUP BY bank_id
      ) r ON r.bank_id = b.id
      LEFT JOIN (
        SELECT bank_id, count(*) FILTER (WHERE status = 'locked') AS locked FROM mavhu.cbz_reporting_periods GROUP BY bank_id
      ) p ON p.bank_id = b.id
      LEFT JOIN (SELECT bank_id, max(timestamp) AS last_activity FROM mavhu.cbz_audit_log GROUP BY bank_id) a ON a.bank_id = b.id
      WHERE NOT b.is_deleted
      ORDER BY b.name
    `);
    return rows;
  }

  async overview() {
    const banks = await this.bankStats();
    const team = await this.listTeam();
    const sum = (key: string) => banks.reduce((total, bank) => total + Number(bank[key] ?? 0), 0);
    return {
      totals: {
        banks: banks.length,
        activeBanks: banks.filter((bank) => bank.status === 'active').length,
        onboardingBanks: banks.filter((bank) => bank.status === 'onboarding').length,
        entities: sum('entities'),
        members: sum('members'),
        activeMembers: sum('activeMembers'),
        emissionRecords: sum('emissionRecords'),
        inReview: sum('inReview'),
        drafts: sum('drafts'),
        signedOff: sum('signedOff'),
        operationalTco2e: sum('operationalTco2e'),
        financedExposureUsd: sum('financedExposureUsd'),
        openIncidents: sum('openIncidents'),
        highRisks: sum('highRisks'),
        lockedPeriods: sum('lockedPeriods'),
        mavhuTeam: team.filter((user) => !user.isDeleted).length,
      },
      banks,
    };
  }

  // ── Banks ─────────────────────────────────────────────────────────────────
  private async getBank(id: number) {
    const bank = await this.banks.findOne({ where: { id, isDeleted: false } });
    if (!bank) throw new NotFoundException(`Bank ${id} not found`);
    return bank;
  }

  async bankDetail(id: number) {
    const bank = await this.getBank(id);
    const [entities, departments] = await Promise.all([
      this.entities.find({ where: { bankId: id }, order: { name: 'ASC' } }),
      this.departments.find({ order: { name: 'ASC' } }),
    ]);
    const codes = new Set(entities.map((entity) => entity.code));
    return { ...bank, entities, departments: departments.filter((dept) => codes.has(dept.entityCode)) };
  }

  /** Onboards a bank, optionally with its first subsidiary and bank administrator in one step. */
  async createBank(actor: AdminActor, dto: AdminCreateBankDto) {
    if (dto.bankAdmin && !dto.firstEntity) {
      throw new BadRequestException('A bank administrator needs a first subsidiary to belong to');
    }

    let bank: Bank;
    try {
      bank = await this.banks.save(
        this.banks.create({
          name: dto.name.trim(),
          country: dto.country.trim(),
          email: dto.email.toLowerCase().trim(),
          phoneNumber: dto.phoneNumber?.trim() || null,
          identifier: dto.identifier.trim(),
          status: dto.status ?? 'onboarding',
          modules: dto.modules ?? [...DASHBOARD_MODULES],
        }),
      );
    } catch (err) {
      rethrowUnique(err, `A bank with email ${dto.email} already exists`);
    }
    await this.log(actor, 'CREATE', 'Bank', String(bank.id), `Onboarded bank ${bank.name}`, bank.id);

    if (dto.firstEntity) await this.addEntity(actor, bank.id, dto.firstEntity);
    if (dto.firstEntity && dto.bankAdmin) {
      await this.createMember(actor, {
        fullName: dto.bankAdmin.fullName,
        email: dto.bankAdmin.email,
        password: dto.bankAdmin.password,
        entityCode: dto.firstEntity.code,
        role: 'admin',
      });
    }
    return this.bankDetail(bank.id);
  }

  async updateBank(actor: AdminActor, id: number, dto: AdminUpdateBankDto) {
    const bank = await this.getBank(id);
    const before = { status: bank.status, modules: bank.modules.join(',') };
    Object.assign(bank, {
      ...dto,
      ...(dto.email ? { email: dto.email.toLowerCase().trim() } : {}),
    });
    try {
      await this.banks.save(bank);
    } catch (err) {
      rethrowUnique(err, `A bank with email ${dto.email} already exists`);
    }

    const changes: string[] = [];
    if (dto.status && dto.status !== before.status) changes.push(`status ${before.status} → ${dto.status}`);
    if (dto.modules && dto.modules.join(',') !== before.modules) changes.push(`modules → ${dto.modules.join(', ') || 'none'}`);
    if (dto.name || dto.email || dto.country || dto.phoneNumber || dto.identifier) changes.push('profile details');
    await this.log(actor, 'UPDATE', 'Bank', String(id), `Updated ${bank.name}: ${changes.join('; ') || 'no changes'}`, id);
    return this.bankDetail(id);
  }

  async addEntity(actor: AdminActor, bankId: number, dto: CreateEntityDto) {
    await this.getBank(bankId);
    if (await this.entities.exists({ where: { code: dto.code } })) {
      throw new ConflictException(`Subsidiary code ${dto.code} is already in use`);
    }
    const entity = await this.entities.save(
      this.entities.create({
        code: dto.code,
        bankId,
        name: dto.name.trim(),
        segment: dto.segment.trim(),
        regulator: dto.regulator.trim(),
        pcafApplicable: dto.pcafApplicable?.trim() ?? '',
        notes: dto.notes?.trim() ?? '',
      }),
    );
    await this.log(actor, 'CREATE', 'Bank', entity.code, `Added subsidiary ${entity.name}`, bankId, entity.code);
    return entity;
  }

  // ── Bank users & roles ────────────────────────────────────────────────────
  async listMembers(bankId?: number) {
    const [banks, entities] = await Promise.all([
      this.banks.find({ where: { isDeleted: false } }),
      this.entities.find(bankId ? { where: { bankId } } : {}),
    ]);
    if (!entities.length) return [];
    const bankById = new Map(banks.map((bank) => [bank.id, bank]));
    const entityByCode = new Map(entities.map((entity) => [entity.code, entity]));
    const rows = await this.members.find({ where: { entityCode: In([...entityByCode.keys()]) }, order: { fullName: 'ASC' } });
    return rows.map(({ passwordHash: _, ...member }) => {
      const entity = entityByCode.get(member.entityCode)!;
      return { ...member, entityName: entity.name, bankId: entity.bankId, bankName: bankById.get(entity.bankId)?.name ?? '—' };
    });
  }

  private async getMember(id: string) {
    const member = await this.members.findOne({ where: { id } });
    if (!member) throw new NotFoundException(`Member ${id} not found`);
    return member;
  }

  private async getEntity(code: string) {
    const entity = await this.entities.findOne({ where: { code } });
    if (!entity) throw new NotFoundException(`Subsidiary ${code} not found`);
    return entity;
  }

  private async assertDepartment(departmentId: string | null | undefined, entityCode: string) {
    if (!departmentId) return;
    const dept = await this.departments.findOne({ where: { id: departmentId } });
    if (!dept || dept.entityCode !== entityCode) {
      throw new BadRequestException(`Department ${departmentId} is not part of ${entityCode}`);
    }
  }

  async createMember(actor: AdminActor, dto: AdminCreateMemberDto) {
    const entity = await this.getEntity(dto.entityCode);
    await this.assertDepartment(dto.departmentId, entity.code);
    let saved: CbzMember;
    try {
      saved = await this.members.save(
        this.members.create({
          id: randomUUID(),
          fullName: dto.fullName.trim(),
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone?.trim() ?? '',
          entityCode: entity.code,
          departmentId: dto.departmentId || null,
          role: dto.role,
          passwordHash: await bcrypt.hash(dto.password, SALT_ROUNDS),
          isActive: true,
        }),
      );
    } catch (err) {
      rethrowUnique(err, `${dto.email} already has an account`);
    }
    await this.log(actor, 'CREATE', 'Member', saved.id, `Created ${saved.fullName} as ${saved.role}`, entity.bankId, entity.code);
    const { passwordHash: _, ...safe } = saved;
    return safe;
  }

  async updateMember(actor: AdminActor, id: string, dto: AdminUpdateMemberDto) {
    const member = await this.getMember(id);
    const entity = await this.getEntity(dto.entityCode ?? member.entityCode);
    const departmentId = dto.departmentId !== undefined ? dto.departmentId || null : dto.entityCode ? null : member.departmentId;
    await this.assertDepartment(departmentId, entity.code);

    const changes: string[] = [];
    if (dto.role && dto.role !== member.role) changes.push(`role ${member.role} → ${dto.role}`);
    if (dto.entityCode && dto.entityCode !== member.entityCode) changes.push(`moved ${member.entityCode} → ${dto.entityCode}`);
    if (dto.isActive !== undefined && dto.isActive !== member.isActive) changes.push(dto.isActive ? 'reactivated' : 'deactivated');

    Object.assign(member, {
      ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      entityCode: entity.code,
      departmentId,
    });
    const saved = await this.members.save(member);
    await this.log(actor, 'UPDATE', 'Member', id, `${saved.fullName}: ${changes.join('; ') || 'profile updated'}`, entity.bankId, entity.code);
    const { passwordHash: _, ...safe } = saved;
    return safe;
  }

  async resetMemberPassword(actor: AdminActor, id: string, password: string) {
    const member = await this.getMember(id);
    member.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.members.save(member);
    const entity = await this.getEntity(member.entityCode);
    await this.log(actor, 'UPDATE', 'Member', id, `Reset password for ${member.fullName}`, entity.bankId, entity.code);
    return { id, reset: true };
  }

  // ── MAvHU team (platform users) ───────────────────────────────────────────
  async listTeam(): Promise<Array<{ id: number; name: string; email: string; isDeleted: boolean; createdAt: Date; roles: string[] }>> {
    return this.users.query(`
      SELECT u.id, u.name, u.email, u.is_deleted AS "isDeleted", u.created_at AS "createdAt",
             COALESCE(array_agg(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
      FROM mavhu.users u
      JOIN mavhu.customers c ON c.id = u.customer_id
      LEFT JOIN mavhu.user_roles ur ON ur.user_id = u.id
      LEFT JOIN mavhu.roles r ON r.id = ur.role_id
      WHERE c.identifier = 'PLATFORM'
      GROUP BY u.id
      ORDER BY u.name
    `);
  }

  private async setUserRoles(userId: number, roleNames: string[], note: string) {
    const roles = await this.roles.find({ where: { name: In(roleNames) } });
    const missing = roleNames.filter((name) => !roles.some((role) => role.name === name));
    if (missing.length) throw new BadRequestException(`Unknown role(s): ${missing.join(', ')}`);
    await this.userRoles.delete({ userId });
    await this.userRoles.save(roles.map((role) => this.userRoles.create({ userId, roleId: role.id, auditTrail: note })));
  }

  async createTeamMember(actor: AdminActor, dto: CreateTeamMemberDto) {
    const platform = await this.customers.findOne({ where: { identifier: 'PLATFORM' as Customer['identifier'] }, order: { id: 'ASC' } });
    if (!platform) throw new NotFoundException('The MAvHU platform organisation is missing (customers.identifier = PLATFORM)');
    let user: User;
    try {
      user = await this.users.save(
        this.users.create({
          name: dto.name.trim(),
          email: dto.email.toLowerCase().trim(),
          password: await bcrypt.hash(dto.password, SALT_ROUNDS),
          customerId: platform.id,
          estateId: null,
        }),
      );
    } catch (err) {
      rethrowUnique(err, `${dto.email} already has an account`);
    }
    await this.setUserRoles(user.id, dto.roles, `Granted by ${actor.email} in the admin console`);
    await this.log(actor, 'CREATE', 'Member', String(user.id), `Added ${user.name} to the MAvHU team as ${dto.roles.join(', ')}`, null);
    return (await this.listTeam()).find((row) => row.id === user.id);
  }

  async updateTeamMember(actor: AdminActor, id: number, dto: UpdateTeamMemberDto) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (id === actor.userId && (dto.isActive === false || (dto.roles && !dto.roles.includes(MAVHU_ADMIN_ROLE)))) {
      throw new BadRequestException('You cannot remove your own admin access');
    }

    const changes: string[] = [];
    if (dto.roles) {
      await this.setUserRoles(id, dto.roles, `Changed by ${actor.email} in the admin console`);
      changes.push(`roles → ${dto.roles.join(', ')}`);
    }
    if (dto.isActive !== undefined && dto.isActive === user.isDeleted) {
      user.isDeleted = !dto.isActive;
      await this.users.save(user);
      changes.push(dto.isActive ? 'reactivated' : 'deactivated');
    }
    await this.log(actor, 'UPDATE', 'Member', String(id), `${user.name}: ${changes.join('; ') || 'no changes'}`, null);
    return (await this.listTeam()).find((row) => row.id === id);
  }

  // ── Reporting periods (assurance lock) ────────────────────────────────────
  async listPeriods(bankId?: number) {
    const [rows, banks] = await Promise.all([
      this.periods.find({ where: bankId ? { bankId } : {}, order: { period: 'DESC' } }),
      this.banks.find(),
    ]);
    const nameOf = new Map(banks.map((bank) => [bank.id, bank.name]));
    return rows.map((row) => ({ ...row, bankName: nameOf.get(row.bankId) ?? '—' }));
  }

  async setPeriod(actor: AdminActor, dto: SetPeriodDto) {
    const bank = await this.getBank(dto.bankId);
    const existing = await this.periods.findOne({ where: { bankId: dto.bankId, period: dto.period } });
    const row = existing ?? this.periods.create({ bankId: dto.bankId, period: dto.period });
    row.status = dto.status;
    row.lockedBy = dto.status === 'locked' ? actor.email : null;
    row.lockedAt = dto.status === 'locked' ? new Date() : null;
    const saved = await this.periods.save(row);
    await this.log(
      actor,
      dto.status === 'locked' ? 'LOCK' : 'UNLOCK',
      'Workflow',
      dto.period,
      `${dto.status === 'locked' ? 'Locked' : 'Reopened'} reporting period ${dto.period} for ${bank.name}`,
      bank.id,
      'GROUP',
    );
    return { ...saved, bankName: bank.name };
  }

  // ── Audit trail ───────────────────────────────────────────────────────────
  async listAudit(bankId?: number, limit = 300) {
    const [rows, banks] = await Promise.all([
      this.audit.find({
        where: bankId ? { bankId } : {},
        order: { timestamp: 'DESC' },
        take: Math.min(Math.max(limit, 1), 2000),
      }),
      this.banks.find(),
    ]);
    const nameOf = new Map(banks.map((bank) => [bank.id, bank.name]));
    return rows.map((row) => ({ ...row, bankName: row.bankId ? (nameOf.get(row.bankId) ?? '—') : 'MAvHU platform' }));
  }
}
