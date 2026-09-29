import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AppConfig } from '../../config/configuration';
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
import { CbzRiskEntry } from './entities/cbz-risk-entry.entity';
import { CbzWorkforce } from './entities/cbz-workforce.entity';

@Injectable()
export class CbzService {
  constructor(
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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<{ jwt: AppConfig['jwt'] }, true>,
  ) {}

  // ── Entities ──────────────────────────────────────────────────────────────
  getEntities() { return this.entities.find({ order: { name: 'ASC' } }); }

  // ── Departments ───────────────────────────────────────────────────────────
  getDepartments() { return this.departments.find({ order: { name: 'ASC' } }); }

  async addDepartment(dto: Partial<CbzDepartment>) {
    const entity = this.departments.create({ id: randomUUID(), ...dto });
    return this.departments.save(entity);
  }

  // ── Members ───────────────────────────────────────────────────────────────
  async addMember(dto: Partial<CbzMember> & { password?: string }) {
    const { password, ...rest } = dto;
    const passwordHash = await bcrypt.hash(password ?? 'cbz-demo', 10);
    const entity = this.members.create({ id: randomUUID(), ...rest, passwordHash });
    const saved = await this.members.save(entity);
    const { passwordHash: _, ...safe } = saved;
    return safe;
  }

  async getMembers() {
    const rows = await this.members.find({ order: { fullName: 'ASC' } });
    return rows.map(({ passwordHash: _, ...safe }) => safe);
  }

  async login(email: string, password: string) {
    const member = await this.members.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!member) throw new UnauthorizedException('Invalid email or password');
    const match = await bcrypt.compare(password, member.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid email or password');
    const { passwordHash: _, ...safe } = member;
    const token = this.jwtService.sign(
      { sub: member.id, email: member.email, role: member.role },
      { expiresIn: this.configService.get('jwt', { infer: true }).expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );
    return { member: safe, token };
  }

  // ── Counterparties ────────────────────────────────────────────────────────
  getCounterparties() { return this.counterparties.find({ order: { name: 'ASC' } }); }

  async addCounterparty(dto: Partial<CbzCounterparty>) {
    const entity = this.counterparties.create({ id: randomUUID(), ...dto });
    return this.counterparties.save(entity);
  }

  // ── Financed positions ────────────────────────────────────────────────────
  getFinancedPositions() { return this.financedPositions.find({ order: { period: 'ASC' } }); }

  async addFinancedPosition(dto: Partial<CbzFinancedPosition>) {
    const entity = this.financedPositions.create({ id: randomUUID(), ...dto });
    return this.financedPositions.save(entity);
  }

  // ── ESG Emissions ─────────────────────────────────────────────────────────
  getEmissions() { return this.emissions.find({ order: { period: 'ASC' } }); }

  async addEmission(dto: Partial<CbzEsgEmission>) {
    const entity = this.emissions.create({ id: randomUUID(), submittedAt: new Date(), status: 'draft', ...dto });
    return this.emissions.save(entity);
  }

  async advanceEmissionStatus(id: string, actorId: string) {
    const record = await this.emissions.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Emission ${id} not found`);
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
  getInsurance() { return this.insurance.find({ order: { clientName: 'ASC' } }); }

  async addInsurance(dto: Partial<CbzInsurancePolicy>) {
    const entity = this.insurance.create({ id: randomUUID(), ...dto });
    return this.insurance.save(entity);
  }

  // ── Financial inclusion ───────────────────────────────────────────────────
  getFinancialInclusion() { return this.financialInclusion.find({ order: { period: 'ASC' } }); }

  // ── Workforce ─────────────────────────────────────────────────────────────
  getWorkforce() { return this.workforce.find({ order: { subsidiary: 'ASC' } }); }

  // ── Incidents ─────────────────────────────────────────────────────────────
  getIncidents() { return this.incidents.find({ order: { dateReported: 'DESC' } }); }

  async addIncident(dto: Partial<CbzIncident>) {
    const entity = this.incidents.create({ id: randomUUID(), ...dto });
    return this.incidents.save(entity);
  }

  // ── Risks ─────────────────────────────────────────────────────────────────
  getRisks() { return this.risks.find({ order: { category: 'ASC' } }); }

  async addRisk(dto: Partial<CbzRiskEntry>) {
    const entity = this.risks.create({ id: randomUUID(), ...dto });
    return this.risks.save(entity);
  }

  // ── Geospatial ────────────────────────────────────────────────────────────
  getGeospatial() { return this.geospatial.find({ order: { passDate: 'DESC' } }); }

  // ── Ingestion ─────────────────────────────────────────────────────────────
  getIngestion() { return this.ingestion.find({ order: { uploadedAt: 'DESC' } }); }

  async addIngestionBatch(dto: Partial<CbzIngestionBatch>) {
    const entity = this.ingestion.create({ id: randomUUID(), uploadedAt: new Date(), ...dto });
    return this.ingestion.save(entity);
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  getAudit() { return this.audit.find({ order: { timestamp: 'DESC' } }); }

  async appendAudit(dto: Partial<CbzAuditLog>) {
    const entry = this.audit.create({ id: randomUUID(), timestamp: new Date(), ...dto });
    return this.audit.save(entry);
  }
}
