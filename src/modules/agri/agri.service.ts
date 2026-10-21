import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AgriActor } from './agri.guard';

const stamp = (who: string, what: string) => `${new Date().toISOString()} ${who}: ${what}`;

/** Agri MRV (A1-A6): a farm's estates, satellite carbon series, crop cycles, emissions and field visits. */
@Injectable()
export class AgriService {
  constructor(private readonly db: DataSource) {}

  private async userName(userId: number): Promise<string> {
    const rows: Array<{ name: string }> = await this.db.query('SELECT name FROM mavhu.users WHERE id = $1', [userId]);
    return rows[0]?.name ?? `user ${userId}`;
  }

  private async assertEstate(actor: AgriActor, estateId: number) {
    const rows = await this.db.query('SELECT id FROM mavhu.estates WHERE id = $1 AND customer_id = $2', [estateId, actor.customerId]);
    if (!rows.length) throw new NotFoundException(`Estate ${estateId} is not one of your estates`);
  }

  private requireWrite(actor: AgriActor) {
    if (!actor.canWrite) throw new ForbiddenException('Your role can view MRV data but not enter it');
  }

  async me(actor: AgriActor) {
    const [customer]: Array<Record<string, unknown>> = await this.db.query(
      'SELECT id, name, country, hectares, identifier FROM mavhu.customers WHERE id = $1', [actor.customerId],
    );
    if (!customer) throw new NotFoundException('Farm not found');
    const banks = await this.db.query(
      `SELECT b.name AS bank, bc.customer_reference_number AS reference
       FROM mavhu.bank_customers bc JOIN mavhu.banks b ON b.id = bc.bank_id WHERE bc.customer_id = $1 ORDER BY b.name`,
      [actor.customerId],
    );
    return {
      name: actor.viewer ? `${actor.email} (MAvHU, read-only)` : await this.userName(actor.userId),
      email: actor.email,
      roles: actor.roles,
      canWrite: actor.canWrite,
      canApprove: actor.canApprove,
      viewer: actor.viewer,
      customer,
      financedBy: banks,
    };
  }

  /** Each estate with its latest pass, 12-month NDVI change and carbon stock. */
  estates(actor: AgriActor) {
    return this.db.query(
      `SELECT e.id, e.name, e.hectares, e.country,
              l.date AS "latestPass", round(l.ndvi_max, 3)::float AS "ndvi", round(l.net_co2_stock)::float AS "carbonStockTco2",
              round(p.ndvi_max, 3)::float AS "ndviYearAgo",
              round((l.net_co2_stock - p.net_co2_stock))::float AS "carbonChangeTco2",
              (SELECT count(*)::int FROM mavhu.crop_cycles c WHERE c.estate_id = e.id) AS "cropCycles",
              (SELECT max(visit_date) FROM mavhu.agri_field_verifications v WHERE v.estate_id = e.id) AS "lastVisit"
       FROM mavhu.estates e
       LEFT JOIN LATERAL (SELECT * FROM mavhu.satellite_ndvi_co2 s WHERE s.estate_id = e.id ORDER BY s.date DESC LIMIT 1) l ON TRUE
       LEFT JOIN LATERAL (SELECT * FROM mavhu.satellite_ndvi_co2 s WHERE s.estate_id = e.id AND s.date <= l.date - interval '360 days' ORDER BY s.date DESC LIMIT 1) p ON TRUE
       WHERE e.customer_id = $1 ORDER BY e.name`,
      [actor.customerId],
    );
  }

  satellite(actor: AgriActor, estateId?: number) {
    return this.db.query(
      `SELECT s.estate_id AS "estateId", s.date, round(s.ndvi_mean, 4)::float AS "ndviMean", round(s.ndvi_min, 4)::float AS "ndviMin",
              round(s.ndvi_max, 4)::float AS "ndviMax", round(s.ndwi_mean, 4)::float AS "ndwiMean",
              round(s.biomass_co2_total)::float AS "biomassCo2", round(s.soil_organic_carbon_co2_total)::float AS "soilCo2",
              round(s.net_co2_stock)::float AS "netCo2Stock"
       FROM mavhu.satellite_ndvi_co2 s
       WHERE s.customer_id = $1 AND ($2::int IS NULL OR s.estate_id = $2)
       ORDER BY s.estate_id, s.date`,
      [actor.customerId, estateId ?? null],
    );
  }

  cropCycles(actor: AgriActor) {
    return this.db.query(
      `SELECT c.id, c.estate_id AS "estateId", e.name AS estate, c.name, c.start_date AS "startDate", c.end_date AS "endDate",
              u.name AS "recordedBy", c.created_at AS "createdAt"
       FROM mavhu.crop_cycles c JOIN mavhu.estates e ON e.id = c.estate_id LEFT JOIN mavhu.users u ON u.id = c.user_id
       WHERE c.customer_id = $1 ORDER BY c.start_date DESC`,
      [actor.customerId],
    );
  }

  async addCropCycle(actor: AgriActor, body: { estateId: number; name: string; startDate: string; endDate: string }) {
    this.requireWrite(actor);
    await this.assertEstate(actor, Number(body.estateId));
    if (!body.name?.trim()) throw new BadRequestException('Name the crop cycle');
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new BadRequestException('End date must be after start date');
    const who = await this.userName(actor.userId);
    const [row] = await this.db.query(
      `INSERT INTO mavhu.crop_cycles (customer_id, estate_id, user_id, name, start_date, end_date, audit_trail)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [actor.customerId, body.estateId, actor.userId, body.name.trim().slice(0, 255), start, end, stamp(who, 'created')],
    );
    return row;
  }

  emissionFactors() {
    return this.db.query('SELECT id, name, component, factor::float, gwp::float, unit, description FROM mavhu.emission_factors ORDER BY name');
  }

  emissions(actor: AgriActor) {
    return this.db.query(
      `SELECT a.id, a.estate_id AS "estateId", e.name AS estate, a.crop_cycle_id AS "cropCycleId", c.name AS "cropCycle",
              f.name AS factor, f.unit, a.quantity::float, a.ton_co2e::float AS "tonCo2e", a.scope, a.approved,
              cu.name AS "createdBy", au.name AS "approvedBy", a.start_date AS "startDate", a.end_date AS "endDate",
              a.note, a.audit_trail AS "auditTrail", a.created_at AS "createdAt"
       FROM mavhu.emissions_accounting a
       JOIN mavhu.estates e ON e.id = a.estate_id
       JOIN mavhu.emission_factors f ON f.id = a.emission_id
       LEFT JOIN mavhu.crop_cycles c ON c.id = a.crop_cycle_id
       LEFT JOIN mavhu.users cu ON cu.id = a.created_by
       LEFT JOIN mavhu.users au ON au.id = a.approved_by
       WHERE a.customer_id = $1 ORDER BY a.created_at DESC`,
      [actor.customerId],
    );
  }

  /** tCO2e = quantity × factor × GWP / 1000 (factors are per kg/litre/kWh). */
  async addEmission(actor: AgriActor, body: { estateId: number; cropCycleId?: number | null; emissionFactorId: number; quantity: number; scope: number; startDate: string; endDate: string; note?: string }) {
    this.requireWrite(actor);
    await this.assertEstate(actor, Number(body.estateId));
    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new BadRequestException('Quantity must be above 0');
    if (![1, 2, 3].includes(Number(body.scope))) throw new BadRequestException('Scope must be 1, 2 or 3');
    const [factor]: Array<{ factor: string; gwp: string; name: string }> = await this.db.query('SELECT factor, gwp, name FROM mavhu.emission_factors WHERE id = $1', [body.emissionFactorId]);
    if (!factor) throw new BadRequestException('Unknown emission factor');
    // Every entry belongs to a crop cycle (the column is NOT NULL); default to the estate's latest.
    let cropCycleId = body.cropCycleId ? Number(body.cropCycleId) : null;
    if (cropCycleId) {
      const ok = await this.db.query('SELECT 1 FROM mavhu.crop_cycles WHERE id = $1 AND estate_id = $2', [cropCycleId, body.estateId]);
      if (!ok.length) throw new BadRequestException('That crop cycle is not on this estate');
    } else {
      const latest: Array<{ id: number }> = await this.db.query('SELECT id FROM mavhu.crop_cycles WHERE estate_id = $1 ORDER BY start_date DESC LIMIT 1', [body.estateId]);
      if (!latest.length) throw new BadRequestException('Record a crop cycle for this estate first');
      cropCycleId = latest[0].id;
    }
    const ton = (quantity * Number(factor.factor) * Number(factor.gwp)) / 1000;
    const who = await this.userName(actor.userId);
    const [row] = await this.db.query(
      `INSERT INTO mavhu.emissions_accounting (customer_id, estate_id, created_by, crop_cycle_id, emission_id, quantity, start_date, end_date, ton_co2e, scope, approved, audit_trail, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, $11, $12) RETURNING id, ton_co2e::float AS "tonCo2e"`,
      [actor.customerId, body.estateId, actor.userId, cropCycleId, body.emissionFactorId, quantity, new Date(body.startDate), new Date(body.endDate),
        Math.round(ton * 10000) / 10000, body.scope, stamp(who, `submitted ${quantity} × ${factor.name}`), (body.note ?? '').slice(0, 2000)],
    );
    return row;
  }

  /** Segregation of duties: an approver cannot approve their own entry. */
  async approveEmission(actor: AgriActor, id: number) {
    if (!actor.canApprove) throw new ForbiddenException('Only ESG approvers can approve entries');
    const [row]: Array<{ created_by: number | null; approved: boolean; audit_trail: string | null }> = await this.db.query(
      'SELECT created_by, approved, audit_trail FROM mavhu.emissions_accounting WHERE id = $1 AND customer_id = $2', [id, actor.customerId],
    );
    if (!row) throw new NotFoundException(`Entry ${id} not found`);
    if (row.approved) throw new BadRequestException('Already approved');
    if (row.created_by === actor.userId) throw new ForbiddenException('Segregation of duties: another approver must approve your own entry');
    const who = await this.userName(actor.userId);
    await this.db.query(
      'UPDATE mavhu.emissions_accounting SET approved = TRUE, approved_by = $1, audit_trail = $2 WHERE id = $3',
      [actor.userId, `${row.audit_trail ?? ''}\n${stamp(who, 'approved')}`.trim(), id],
    );
    return { id, approved: true };
  }

  verifications(actor: AgriActor) {
    return this.db.query(
      `SELECT v.id, v.estate_id AS "estateId", e.name AS estate, v.visit_date AS "visitDate", v.officer, v.method, v.findings,
              v.ndvi_confirmed AS "ndviConfirmed", v.status, v.created_at AS "createdAt"
       FROM mavhu.agri_field_verifications v JOIN mavhu.estates e ON e.id = v.estate_id
       WHERE v.customer_id = $1 ORDER BY v.visit_date DESC`,
      [actor.customerId],
    );
  }

  async addVerification(actor: AgriActor, body: { estateId: number; visitDate: string; officer: string; method: string; findings: string; ndviConfirmed?: boolean }) {
    this.requireWrite(actor);
    await this.assertEstate(actor, Number(body.estateId));
    if (!body.officer?.trim() || !body.method?.trim() || !body.findings?.trim()) throw new BadRequestException('Officer, method and findings are required');
    if (Number.isNaN(Date.parse(body.visitDate))) throw new BadRequestException('Visit date is not a date');
    const [row] = await this.db.query(
      `INSERT INTO mavhu.agri_field_verifications (customer_id, estate_id, visit_date, officer, method, findings, ndvi_confirmed, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Submitted', $8) RETURNING id`,
      [actor.customerId, body.estateId, body.visitDate.slice(0, 10), body.officer.trim().slice(0, 255), body.method.trim().slice(0, 100), body.findings.trim().slice(0, 2000), body.ndviConfirmed !== false, actor.userId],
    );
    return row;
  }

  async reviewVerification(actor: AgriActor, id: number, status: string) {
    if (!actor.canApprove) throw new ForbiddenException('Only ESG approvers can confirm or dispute a field visit');
    if (!['Verified', 'Disputed'].includes(status)) throw new BadRequestException('Status must be Verified or Disputed');
    const result = await this.db.query(
      'UPDATE mavhu.agri_field_verifications SET status = $1 WHERE id = $2 AND customer_id = $3 RETURNING id, status', [status, id, actor.customerId],
    );
    // TypeORM returns [rows, affectedCount] for an UPDATE … RETURNING.
    const rows = Array.isArray(result[0]) ? result[0] : result;
    if (!rows.length) throw new NotFoundException(`Visit ${id} not found`);
    return { id, status };
  }
}
