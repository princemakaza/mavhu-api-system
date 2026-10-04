import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, EntityManager, EntityTarget, In, ObjectLiteral, Repository } from 'typeorm';
import { Bank } from '../../banks/entities/bank.entity';
import { CallerContext, CbzService, ScopeInput } from '../cbz.service';
import { CbzAuditLog } from '../entities/cbz-audit-log.entity';
import { CbzCounterparty } from '../entities/cbz-counterparty.entity';
import { CbzEntity } from '../entities/cbz-entity.entity';
import { CbzEsgEmission } from '../entities/cbz-esg-emission.entity';
import { CbzFinancedPosition } from '../entities/cbz-financed-position.entity';
import { CbzFinancialInclusion } from '../entities/cbz-financial-inclusion.entity';
import { CbzGeospatial } from '../entities/cbz-geospatial.entity';
import { CbzIncident } from '../entities/cbz-incident.entity';
import { CbzIngestionBatch } from '../entities/cbz-ingestion-batch.entity';
import { CbzInsurancePolicy } from '../entities/cbz-insurance-policy.entity';
import { CbzReportingPeriod } from '../entities/cbz-reporting-period.entity';
import { CbzRiskEntry } from '../entities/cbz-risk-entry.entity';
import { CbzWorkforce } from '../entities/cbz-workforce.entity';
import {
  ASSET_CLASS_DENOMINATOR,
  ASSET_CLASSES,
  ColumnDef,
  DATASETS,
  DatasetDef,
  DatasetKey,
  INFO_SHEETS,
  SCOPE3_CATEGORY_LABELS,
} from './import-datasets';
import { buildImportTemplate } from './import-template';
import { CellValue, RawSheet, readUpload } from './workbook-reader';

export interface ImportIssue {
  row: number;
  column?: string;
  code: string;
  message: string;
}

export interface SheetResult {
  sheet: string;
  dataset: DatasetKey | null;
  label: string;
  /** ready = dry run passed; imported/partial/failed after commit; skipped = not an importable sheet. */
  status: 'ready' | 'imported' | 'partial' | 'failed' | 'skipped' | 'empty';
  reason?: string;
  notes: string[];
  totalRows: number;
  validRows: number;
  toCreate: number;
  toUpdate: number;
  rejected: number;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  batchId?: string;
}

export interface ImportResult {
  fileName: string;
  bankName: string;
  dryRun: boolean;
  sheets: SheetResult[];
  totals: { rows: number; valid: number; created: number; updated: number; rejected: number };
}

/** Roles that may submit data. Readers and auditors are read-only. */
const IMPORT_ROLES = new Set(['admin', 'approver', 'contributor', 'customer', 'mavhu-admin']);
/** Roles that may import for any subsidiary of their bank; the rest only for their own. */
const BANK_WIDE_ROLES = new Set(['admin', 'approver', 'mavhu-admin']);
const MAX_ISSUES = 200;

type Row = Record<string, unknown>;

/** One record to write: rows are saved per entity type, in the order the types first appear. */
interface Write {
  target: EntityTarget<ObjectLiteral>;
  data: ObjectLiteral;
}

interface SheetPlan {
  result: SheetResult;
  writes: Write[];
  /** Subsidiary of each valid row, used to label the ingestion batch. */
  subsidiaries: string[];
}

interface Ctx {
  caller: CallerContext;
  bank: Bank;
  bankCodes: Set<string>;
  allowedCodes: Set<string>;
  lockedPeriods: Set<string>;
  defaultPeriod: string | null;
  fileName: string;
  isCsv: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const normLoose = (s: string) => norm(s.replace(/\([^)]*\)/g, ''));
const shortId = (prefix: string) => `${prefix}-${randomBytes(5).toString('hex').toUpperCase()}`;
const pad = (n: number) => String(n).padStart(2, '0');

@Injectable()
export class CbzImportService {
  constructor(
    private readonly cbz: CbzService,
    private readonly dataSource: DataSource,
    @InjectRepository(Bank) private banks: Repository<Bank>,
    @InjectRepository(CbzEntity) private entities: Repository<CbzEntity>,
    @InjectRepository(CbzReportingPeriod) private periods: Repository<CbzReportingPeriod>,
    @InjectRepository(CbzEsgEmission) private emissions: Repository<CbzEsgEmission>,
    @InjectRepository(CbzCounterparty) private counterparties: Repository<CbzCounterparty>,
    @InjectRepository(CbzFinancedPosition) private financedPositions: Repository<CbzFinancedPosition>,
    @InjectRepository(CbzInsurancePolicy) private insurance: Repository<CbzInsurancePolicy>,
    @InjectRepository(CbzGeospatial) private geospatial: Repository<CbzGeospatial>,
    @InjectRepository(CbzFinancialInclusion) private financialInclusion: Repository<CbzFinancialInclusion>,
    @InjectRepository(CbzWorkforce) private workforce: Repository<CbzWorkforce>,
    @InjectRepository(CbzIncident) private incidents: Repository<CbzIncident>,
    @InjectRepository(CbzIngestionBatch) private ingestion: Repository<CbzIngestionBatch>,
    @InjectRepository(CbzRiskEntry) private risks: Repository<CbzRiskEntry>,
  ) {}

  // ── Entry point ───────────────────────────────────────────────────────────
  async run(input: ScopeInput, file: { buffer: Buffer; originalname: string }, dryRun: boolean, defaultPeriod?: string): Promise<ImportResult> {
    const caller = await this.cbz.resolveCaller(input);
    if (!IMPORT_ROLES.has(caller.role)) throw new ForbiddenException('Your role can view data but not import it');

    const period = defaultPeriod?.trim() ? parsePeriod(defaultPeriod.trim()) : null;
    if (defaultPeriod?.trim() && !period) throw new BadRequestException('Default period must look like 2026-08, 2026-Q3 or 2026');

    const bank = await this.banks.findOneOrFail({ where: { id: caller.scope.bankId } });
    const locked = await this.periods.find({ where: { bankId: bank.id, status: 'locked' } });
    const ctx: Ctx = {
      caller,
      bank,
      bankCodes: new Set(caller.scope.codes),
      allowedCodes: new Set(BANK_WIDE_ROLES.has(caller.role) ? caller.scope.codes : [caller.entityCode ?? '']),
      lockedPeriods: new Set(locked.map((p) => p.period)),
      defaultPeriod: period,
      fileName: file.originalname,
      isCsv: /\.(csv|txt)$/i.test(file.originalname),
    };

    const sheets = await readUpload(file.buffer, file.originalname);
    const plans: SheetPlan[] = [];
    for (const sheet of sheets) plans.push(await this.planSheet(sheet, ctx));

    if (!dryRun) await this.commit(plans, ctx, sheets.length > 1);

    const results = plans.map((p) => p.result);
    const imported = results.filter((r) => r.dataset);
    return {
      fileName: file.originalname,
      bankName: bank.name,
      dryRun,
      sheets: results,
      totals: {
        rows: imported.reduce((n, r) => n + r.totalRows, 0),
        valid: imported.reduce((n, r) => n + r.validRows, 0),
        created: imported.reduce((n, r) => n + r.toCreate, 0),
        updated: imported.reduce((n, r) => n + r.toUpdate, 0),
        rejected: imported.reduce((n, r) => n + r.rejected, 0),
      },
    };
  }

  /** The bank's own upload template (its subsidiary codes pre-filled in the drop-downs). */
  async template(input: ScopeInput): Promise<{ buffer: Buffer; fileName: string }> {
    const caller = await this.cbz.resolveCaller(input);
    const bank = await this.banks.findOneOrFail({ where: { id: caller.scope.bankId } });
    const entities = await this.entities.find({ where: { bankId: bank.id }, order: { code: 'ASC' } });
    const buffer = await buildImportTemplate(bank.name, entities.map((e) => ({ code: e.code, name: e.name })));
    const slug = bank.name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    return { buffer, fileName: `${slug}_ESG_import_template.xlsx` };
  }

  /** What the importer accepts, for the upload screen's help panel. */
  describe() {
    return {
      datasets: DATASETS.map((d) => ({
        key: d.key,
        sheet: d.sheet,
        label: d.label,
        columns: d.columns.map((c) => ({ header: c.header, required: Boolean(c.required) })),
      })),
      notImported: INFO_SHEETS.filter((s) => s.signature.length).map((s) => ({ sheet: s.sheet, reason: s.reason })),
    };
  }

  // ── Sheet detection ───────────────────────────────────────────────────────
  private detect(sheet: RawSheet): { def: DatasetDef; headerIdx: number; colMap: Map<string, number> } | { info: string } | null {
    const byName = INFO_SHEETS.find((s) => norm(s.sheet) === norm(sheet.name));
    if (byName && byName.signature.length === 0) return { info: byName.reason };

    let best: { def: DatasetDef; headerIdx: number; colMap: Map<string, number>; score: number } | null = null;
    let info: { reason: string; score: number } | null = null;
    sheet.rows.slice(0, 10).forEach((row, headerIdx) => {
      for (const def of DATASETS) {
        const colMap = matchHeaders(row.cells, def.columns);
        const required = def.columns.filter((c) => c.required);
        if (colMap.size < 3 || !required.every((c) => colMap.has(c.key))) continue;
        const score = colMap.size + (norm(def.sheet) === norm(sheet.name) ? 0.5 : 0);
        if (!best || score > best.score) best = { def, headerIdx, colMap, score };
      }
      const headers = new Set(row.cells.filter((c): c is string => typeof c === 'string').map(norm));
      for (const s of INFO_SHEETS) {
        if (s.signature.length && s.signature.every((h) => headers.has(norm(h))) && (!info || s.signature.length > info.score)) {
          info = { reason: s.reason, score: s.signature.length };
        }
      }
    });
    const found = best as { def: DatasetDef; headerIdx: number; colMap: Map<string, number>; score: number } | null;
    const infoFound = info as { reason: string; score: number } | null;
    if (found && (!infoFound || found.score >= infoFound.score)) return found;
    if (infoFound) return { info: infoFound.reason };
    return null;
  }

  // ── Validation ────────────────────────────────────────────────────────────
  private async planSheet(sheet: RawSheet, ctx: Ctx): Promise<SheetPlan> {
    const result: SheetResult = {
      sheet: sheet.name,
      dataset: null,
      label: sheet.name,
      status: 'skipped',
      notes: [],
      totalRows: 0,
      validRows: 0,
      toCreate: 0,
      toUpdate: 0,
      rejected: 0,
      errors: [],
      warnings: [],
    };
    const plan: SheetPlan = { result, writes: [], subsidiaries: [] };

    const detected = this.detect(sheet);
    if (!detected) {
      result.reason = "Columns not recognised. Use the sheet layout from the import template (title in row 1, headers in row 2).";
      return plan;
    }
    if ('info' in detected) {
      result.reason = detected.info;
      return plan;
    }

    const { def, headerIdx, colMap } = detected;
    result.dataset = def.key;
    result.label = def.label;
    const headerRow = sheet.rows[headerIdx].rowNumber;
    const missingOptional = def.columns.filter((c) => !c.required && !colMap.has(c.key) && c.key !== 'id').map((c) => c.header);
    if (!colMap.has('id')) result.notes.push(`No ${def.columns[0].header} column: every row becomes a new record, so re-uploading this file would duplicate it.`);
    if (missingOptional.length) result.notes.push(`Optional columns not in this sheet: ${missingOptional.join(', ')}.`);

    // Parse every data row into typed values.
    const parsed: Array<{ rowNumber: number; row: Row }> = [];
    for (const raw of sheet.rows.slice(headerIdx + 1)) {
      if (raw.rowNumber <= headerRow) continue;
      const filled = [...colMap.values()].filter((i) => raw.cells[i] !== null && raw.cells[i] !== undefined && raw.cells[i] !== '').length;
      if (filled <= 1) continue; // footnote rows such as "Standing dataset: …"
      result.totalRows++;
      const row: Row = {};
      const issues: ImportIssue[] = [];
      for (const col of def.columns) {
        const idx = colMap.get(col.key);
        const coerced = coerce(col, idx === undefined ? null : (raw.cells[idx] ?? null));
        if ('error' in coerced) issues.push({ row: raw.rowNumber, column: col.header, code: coerced.code, message: coerced.error });
        else row[col.key] = coerced.value;
      }
      if (issues.length) {
        this.reject(result, issues);
        continue;
      }
      parsed.push({ rowNumber: raw.rowNumber, row });
    }

    // Duplicate ids inside the sheet.
    const seen = new Map<string, number>();
    const unique = parsed.filter(({ rowNumber, row }) => {
      const id = row.id as string | null;
      if (!id) return true;
      const first = seen.get(id.toLowerCase());
      if (first !== undefined) {
        this.reject(result, [{ row: rowNumber, column: def.columns[0].header, code: 'DUPLICATE_ID', message: `${id} already appears on row ${first}` }]);
        return false;
      }
      seen.set(id.toLowerCase(), rowNumber);
      return true;
    });

    await this.buildWrites(def, unique, ctx, plan);
    result.errors.sort((a, b) => a.row - b.row);
    result.warnings.sort((a, b) => a.row - b.row);
    result.validRows = result.toCreate + result.toUpdate;
    result.status = result.totalRows === 0 ? 'empty' : result.validRows === 0 ? 'failed' : 'ready';
    if (result.totalRows === 0) result.reason = 'No data rows under the header row.';
    return plan;
  }

  private reject(result: SheetResult, issues: ImportIssue[]) {
    result.rejected++;
    for (const issue of issues) if (result.errors.length < MAX_ISSUES) result.errors.push(issue);
  }

  private warn(result: SheetResult, issue: ImportIssue) {
    if (result.warnings.length < MAX_ISSUES) result.warnings.push(issue);
  }

  /** Checks a subsidiary code against the caller's bank and permissions. Never reveals other banks' codes. */
  private subsidiaryIssue(ctx: Ctx, code: string, row: number, column: string): ImportIssue | null {
    if (!ctx.bankCodes.has(code)) {
      return { row, column, code: 'UNKNOWN_SUBSIDIARY', message: `'${code}' is not one of ${ctx.bank.name}'s subsidiaries (${[...ctx.bankCodes].join(', ')})` };
    }
    if (!ctx.allowedCodes.has(code)) {
      return { row, column, code: 'OUT_OF_SCOPE', message: `Your role can only import data for ${ctx.caller.entityCode}` };
    }
    return null;
  }

  private periodIssue(ctx: Ctx, period: string, row: number): ImportIssue | null {
    const candidates = [period];
    const month = /^(\d{4})-(\d{2})$/.exec(period);
    if (month) candidates.push(`${month[1]}-Q${Math.ceil(Number(month[2]) / 3)}`, month[1]);
    const quarter = /^(\d{4})-Q[1-4]$/.exec(period);
    if (quarter) candidates.push(quarter[1]);
    const hit = candidates.find((p) => ctx.lockedPeriods.has(p));
    return hit ? { row, column: 'Period', code: 'PERIOD_LOCKED', message: `Reporting period ${hit} is locked; ask a MAvHU administrator to reopen it` } : null;
  }

  private async existingById<T extends ObjectLiteral>(repo: Repository<T>, ids: string[]): Promise<Map<string, T>> {
    const map = new Map<string, T>();
    for (let i = 0; i < ids.length; i += 1000) {
      const rows = await repo.find({ where: { id: In(ids.slice(i, i + 1000)) } as never });
      for (const row of rows) map.set(String((row as ObjectLiteral).id), row);
    }
    return map;
  }

  private async buildWrites(def: DatasetDef, rows: Array<{ rowNumber: number; row: Row }>, ctx: Ctx, plan: SheetPlan) {
    const { result } = plan;
    const idCol = def.columns[0].header;
    const ids = rows.map((r) => r.row.id as string | null).filter((id): id is string => Boolean(id));

    // Generic checks shared by every dataset: id length, subsidiary, period lock.
    const accept = (rowNumber: number, row: Row, subsidiaryKey: string | null): string | null => {
      const issues: ImportIssue[] = [];
      const id = (row.id as string | null) ?? null;
      if (id && id.length > def.idMax) issues.push({ row: rowNumber, column: idCol, code: 'ID_TOO_LONG', message: `IDs in this sheet can be at most ${def.idMax} characters` });
      let code: string | null = null;
      if (subsidiaryKey) {
        code = String(row[subsidiaryKey]).toUpperCase();
        const issue = this.subsidiaryIssue(ctx, code, rowNumber, def.columns.find((c) => c.key === subsidiaryKey)?.header ?? 'Subsidiary');
        if (issue) issues.push(issue);
      }
      if (def.periodLocked && row.period) {
        const issue = this.periodIssue(ctx, String(row.period), rowNumber);
        if (issue) issues.push(issue);
      }
      if (issues.length) {
        this.reject(result, issues);
        return null;
      }
      return code ?? '';
    };
    /** Existing record with this id must belong to this bank (and to a subsidiary the caller may edit). */
    const ownership = (rowNumber: number, existingCode: string | null | undefined): boolean => {
      if (existingCode === undefined) return true;
      if (!existingCode || !ctx.bankCodes.has(existingCode)) {
        this.reject(result, [{ row: rowNumber, column: idCol, code: 'ID_CONFLICT', message: 'This ID is already used by another organisation; give the row a different ID' }]);
        return false;
      }
      if (!ctx.allowedCodes.has(existingCode)) {
        this.reject(result, [{ row: rowNumber, column: idCol, code: 'OUT_OF_SCOPE', message: `This record belongs to ${existingCode}, which your role cannot change` }]);
        return false;
      }
      return true;
    };
    const record = (isNew: boolean, target: EntityTarget<ObjectLiteral>, data: ObjectLiteral, subsidiary: string) => {
      plan.writes.push({ target, data });
      plan.subsidiaries.push(subsidiary);
      if (isNew) result.toCreate++;
      else result.toUpdate++;
    };
    const checkTotal = (rowNumber: number, column: string, provided: unknown, computed: number) => {
      if (typeof provided !== 'number' || !Number.isFinite(computed)) return;
      const base = Math.max(Math.abs(computed), Math.abs(provided), 1e-9);
      if (Math.abs(provided - computed) / base > 0.01) {
        this.warn(result, { row: rowNumber, column, code: 'CALC_MISMATCH', message: `Sheet says ${round(provided)}, platform calculates ${round(computed)}; the platform value is stored` });
      }
    };
    const sourceRef = (row: Row) => (row.sourceFile as string | null) ?? (ctx.isCsv ? ctx.fileName : `${ctx.fileName} › ${result.sheet}`).slice(0, 255);

    switch (def.key) {
      case 'scope1':
      case 'scope2':
      case 'scope3':
      case 'emissionsSimple': {
        const existing = await this.existingById(this.emissions, ids);
        if (def.key === 'scope2') result.notes.push('Location-based emissions are stored; market-based figures are only checked.');
        for (const { rowNumber, row } of rows) {
          const code = accept(rowNumber, row, 'subsidiary');
          if (code === null) continue;
          const id = (row.id as string | null) ?? shortId(def.idPrefix);
          const prior = existing.get(id);
          if (!ownership(rowNumber, prior ? prior.entityCode : undefined)) continue;
          if (prior && (prior.status === 'approved' || prior.status === 'locked')) {
            this.reject(result, [{ row: rowNumber, column: idCol, code: 'RECORD_LOCKED', message: `${id} is already ${prior.status}; signed-off records cannot be overwritten by an upload` }]);
            continue;
          }

          let scope: string, datasetType: string, site: string, unit: string, method: string, fuelType: string | null = null;
          let activity: number, factor: number, dq: number;
          if (def.key === 'scope1') {
            scope = 'scope1';
            datasetType = row.datasetType as string;
            site = row.site as string;
            fuelType = (row.fuelType as string | null) ?? null;
            activity = row.activity as number;
            unit = row.unit as string;
            factor = row.factor as number;
            method = (row.method as string | null) ?? 'activity-based';
            dq = (row.dataQuality as number | null) ?? 2;
          } else if (def.key === 'scope2') {
            scope = 'scope2';
            datasetType = 'Grid electricity (location-based)';
            site = row.site as string;
            activity = row.kwh as number;
            unit = 'kWh';
            factor = row.factor as number;
            method = 'activity-based';
            dq = (row.dataQuality as number | null) ?? 2;
            if (typeof row.marketFactor === 'number') {
              const solar = typeof row.solarKwh === 'number' ? row.solarKwh : 0;
              checkTotal(rowNumber, 'Market-based Emissions (tCO2e)', row.marketEmissionsT, (Math.max(activity - solar, 0) * row.marketFactor) / 1000);
            }
          } else if (def.key === 'scope3') {
            scope = 'scope3';
            const category = row.category as string;
            datasetType = `${category} - ${SCOPE3_CATEGORY_LABELS[category] ?? 'Other'}`;
            site = (row.description as string | null) ?? 'Group';
            activity = row.activity as number;
            unit = row.unit as string;
            factor = row.factor as number;
            method = row.method as string;
            dq = (row.dataQuality as number | null) ?? (method === 'spend-based' ? 4 : 3);
          } else {
            scope = row.scope as string;
            datasetType = row.datasetType as string;
            site = row.site as string;
            activity = row.activity as number;
            unit = row.unit as string;
            factor = row.factor as number;
            method = (row.method as string | null) ?? 'activity-based';
            dq = row.dataQuality as number;
          }
          if (dq < 1 || dq > 5) {
            this.reject(result, [{ row: rowNumber, column: 'Data Quality', code: 'INVALID_VALUE', message: 'Data quality must be 1 (best) to 5' }]);
            continue;
          }
          if (activity < 0 || factor < 0) {
            this.reject(result, [{ row: rowNumber, code: 'INVALID_NUMBER', message: 'Activity data and emission factor cannot be negative' }]);
            continue;
          }
          const kg = activity * factor;
          checkTotal(rowNumber, 'Emissions (kgCO2e)', row.emissionsKg, kg);
          checkTotal(rowNumber, scope === 'scope2' ? 'Location-based Emissions (tCO2e)' : 'Emissions (tCO2e)', row.emissionsT, kg / 1000);
          record(!prior, CbzEsgEmission, {
            ...(prior ?? {}),
            id,
            entityCode: code,
            site,
            period: row.period as string,
            scope,
            datasetType,
            fuelType,
            activityData: activity,
            unit,
            emissionFactorKgPerUnit: factor,
            emissionsKgCo2e: round(kg, 4),
            emissionsTco2e: round(kg / 1000, 6),
            method,
            dataQuality: dq,
            // A changed record goes back through review.
            status: 'draft',
            sourceRef: sourceRef(row),
            submittedBy: ctx.caller.memberId ?? prior?.submittedBy ?? null,
            submittedAt: new Date(),
            approvedBy: null,
            approvedAt: null,
          }, code);
        }
        break;
      }

      case 'financed': {
        result.notes.push('Attribution factor and financed emissions are recalculated by the platform (PCAF Part A).');
        const existing = await this.existingById(this.financedPositions, ids);
        const bankCounterparties = ctx.bankCodes.size ? await this.counterparties.find({ where: { subsidiary: In([...ctx.bankCodes]) } }) : [];
        const cpById = new Map(bankCounterparties.map((cp) => [cp.id, cp]));
        const cpByName = new Map(bankCounterparties.map((cp) => [`${cp.subsidiary}|${cp.name.toLowerCase()}`, cp]));
        const priorCpIds = [...existing.values()].map((p) => p.counterpartyId).filter((id) => !cpById.has(id));
        const foreignCps = await this.existingById(this.counterparties, priorCpIds);

        for (const { rowNumber, row } of rows) {
          const code = accept(rowNumber, row, 'subsidiary');
          if (code === null) continue;
          const id = (row.id as string | null) ?? shortId(def.idPrefix);
          const prior = existing.get(id);
          const priorCode = prior ? (cpById.get(prior.counterpartyId) ?? foreignCps.get(prior.counterpartyId))?.subsidiary ?? null : undefined;
          if (!ownership(rowNumber, priorCode)) continue;

          const assetClass = matchAssetClass(row.assetClass as string);
          if (!assetClass) {
            this.reject(result, [{ row: rowNumber, column: 'Asset Class', code: 'INVALID_VALUE', message: `Unknown PCAF asset class '${row.assetClass}'` }]);
            continue;
          }
          const period = (row.period as string | null) ?? periodFromFileName(row.sourceFile as string | null) ?? ctx.defaultPeriod;
          if (!period) {
            this.reject(result, [{ row: rowNumber, column: 'Period', code: 'MISSING_FIELD', message: 'No period: add a Period column, name the Source File like …_2026-Q3_v1.csv, or choose a default period' }]);
            continue;
          }
          const lockIssue = this.periodIssue(ctx, period, rowNumber);
          if (lockIssue) {
            this.reject(result, [lockIssue]);
            continue;
          }
          const denominator = row.denominator as number;
          const outstanding = row.outstanding as number;
          if (denominator <= 0 || outstanding < 0) {
            this.reject(result, [{ row: rowNumber, column: 'Denominator Value (US$)', code: 'INVALID_NUMBER', message: 'Denominator must be above 0 and outstanding amount cannot be negative' }]);
            continue;
          }
          const dq = row.dataQuality as number;
          if (dq < 1 || dq > 5) {
            this.reject(result, [{ row: rowNumber, column: 'Data Quality Score (1-5)', code: 'INVALID_VALUE', message: 'Data quality must be 1 (best) to 5' }]);
            continue;
          }
          const attribution = outstanding / denominator;
          if (attribution > 1) this.warn(result, { row: rowNumber, column: 'Outstanding Amount (US$)', code: 'ATTRIBUTION_ABOVE_1', message: 'Outstanding amount exceeds the denominator; check the figures' });
          checkTotal(rowNumber, 'Attribution Factor', row.attribution, attribution);
          checkTotal(rowNumber, 'Financed Emissions (tCO2e)', row.financedEmissions, attribution * (row.borrowerEmissions as number));

          const denomKey = ASSET_CLASS_DENOMINATOR[assetClass];
          const nameKey = `${code}|${String(row.borrower).toLowerCase()}`;
          const cp = cpByName.get(nameKey) ?? (prior ? cpById.get(prior.counterpartyId) : undefined);
          const counterparty: ObjectLiteral = {
            ...(cp ?? {}),
            id: cp?.id ?? shortId('CP'),
            name: row.borrower as string,
            sector: row.sector as string,
            listedStatus: row.listedStatus as string,
            assetClass,
            subsidiary: code,
            financials: { ...(cp?.financials ?? {}), [denomKey]: denominator },
            totalEmissionsTco2e: row.borrowerEmissions as number,
            dqScore: dq,
            mrvEnhanced: (row.mrv as boolean | null) ?? false,
          };
          // Later rows for the same borrower reuse (and refresh) this counterparty.
          cpByName.set(nameKey, counterparty as CbzCounterparty);
          plan.writes.push({ target: CbzCounterparty, data: counterparty });
          record(!prior, CbzFinancedPosition, { ...(prior ?? {}), id, counterpartyId: counterparty.id, outstandingAmountUsd: outstanding, period }, code);
        }
        break;
      }

      case 'insurance': {
        const existing = await this.existingById(this.insurance, ids);
        const bankCounterparties = ctx.bankCodes.size ? await this.counterparties.find({ where: { subsidiary: In([...ctx.bankCodes]) } }) : [];
        const cpByName = new Map(bankCounterparties.map((cp) => [cp.name.toLowerCase(), cp]));
        for (const { rowNumber, row } of rows) {
          const code = accept(rowNumber, row, 'subsidiary');
          if (code === null) continue;
          const id = (row.id as string | null) ?? shortId(def.idPrefix);
          const prior = existing.get(id);
          if (!ownership(rowNumber, prior ? prior.subsidiary : undefined)) continue;
          const premium = row.premium as number;
          const denominator = row.denominator as number | null;
          let attribution: number;
          if (denominator !== null && denominator > 0) {
            attribution = premium / denominator;
            checkTotal(rowNumber, 'Attribution Factor', row.attribution, attribution);
          } else if (typeof row.attribution === 'number') {
            attribution = row.attribution; // e.g. PCAF published fallback factor
          } else {
            this.reject(result, [{ row: rowNumber, column: 'Denominator Value (US$)', code: 'MISSING_FIELD', message: 'Give a Denominator Value, or an Attribution Factor when a published fallback factor is used' }]);
            continue;
          }
          const dq = row.dataQuality as number;
          if (dq < 1 || dq > 5) {
            this.reject(result, [{ row: rowNumber, column: 'Data Quality Score', code: 'INVALID_VALUE', message: 'Data quality must be 1 (best) to 5' }]);
            continue;
          }
          const associated = attribution * (row.clientEmissions as number);
          checkTotal(rowNumber, 'Insurance-Associated Emissions (tCO2e)', row.associatedEmissions, associated);
          const client = row.client as string;
          record(!prior, CbzInsurancePolicy, {
            ...(prior ?? {}),
            id,
            segment: row.segment as string,
            subsidiary: code,
            clientId: cpByName.get(client.toLowerCase())?.id ?? prior?.clientId ?? `EXT-${id}`.slice(0, 50),
            clientName: client,
            sector: row.sector as string,
            grossWrittenPremiumUsd: premium,
            denominatorType: row.denominatorType as string,
            denominatorValueUsd: denominator,
            clientTotalEmissions: row.clientEmissions as number,
            attributionFactor: round(attribution, 8),
            insuranceAssociatedEmissions: round(associated, 4),
            dqScore: dq,
          }, code);
        }
        break;
      }

      case 'geospatial': {
        const existing = await this.existingById(this.geospatial, ids);
        for (const { rowNumber, row } of rows) {
          const code = accept(rowNumber, row, 'subsidiary');
          if (code === null) continue;
          const id = (row.id as string | null) ?? shortId(def.idPrefix);
          const prior = existing.get(id);
          if (!ownership(rowNumber, prior ? prior.subsidiary : undefined)) continue;
          const ndvi = row.ndvi as number | null;
          if (ndvi !== null && (ndvi < -1 || ndvi > 1)) {
            this.reject(result, [{ row: rowNumber, column: 'NDVI', code: 'INVALID_NUMBER', message: 'NDVI must be between -1 and 1' }]);
            continue;
          }
          record(!prior, CbzGeospatial, {
            ...(prior ?? {}),
            id,
            linkedBorrowerName: row.borrower as string,
            subsidiary: code,
            district: row.district as string,
            coordinates: row.coordinates as string,
            passDate: row.passDate as string,
            dataSource: row.dataSource as string,
            ndvi,
            landUse: row.landUse as string,
            areaHa: row.areaHa as number,
            deforestationFlag: row.deforestation as string,
            floodRisk: row.floodRisk as string,
            droughtStress: row.droughtStress as string,
          }, code);
        }
        break;
      }

      case 'financialInclusion': {
        const existing = await this.existingById(this.financialInclusion, ids);
        for (const { rowNumber, row } of rows) {
          const code = accept(rowNumber, row, 'subsidiary');
          if (code === null) continue;
          const id = (row.id as string | null) ?? shortId(def.idPrefix);
          const prior = existing.get(id);
          if (!ownership(rowNumber, prior ? prior.subsidiary : undefined)) continue;
          record(!prior, CbzFinancialInclusion, {
            ...(prior ?? {}),
            id,
            subsidiary: code,
            programme: row.programme as string,
            beneficiaryCount: row.beneficiaries as number,
            femaleShare: row.femaleShare as number,
            totalDisbursedUsd: row.disbursed as number,
            geography: row.geography as string,
            sdgAlignment: (row.sdg as string | null) ?? '',
            repaymentRate: row.repaymentRate as number,
            period: row.period as string,
          }, code);
        }
        break;
      }

      case 'workforce': {
        const existing = await this.existingById(this.workforce, ids);
        for (const { rowNumber, row } of rows) {
          const code = accept(rowNumber, row, 'subsidiary');
          if (code === null) continue;
          const natural = `WF-${code}-${row.period}`;
          const id = (row.id as string | null) ?? (natural.length <= def.idMax ? natural : shortId(def.idPrefix));
          const prior = existing.get(id);
          if (!ownership(rowNumber, prior ? prior.subsidiary : undefined)) continue;
          record(!prior, CbzWorkforce, {
            ...(prior ?? {}),
            id,
            subsidiary: code,
            period: row.period as string,
            headcount: row.headcount as number,
            femaleShare: row.femaleShare as number,
            avgTrainingHours: row.trainingHours as number,
            ltiRate: row.ltiRate as number,
            voluntaryTurnover: row.turnover as number,
            localHireShare: row.localHire as number,
          }, code);
        }
        break;
      }

      case 'incidents': {
        const existing = await this.existingById(this.incidents, ids);
        for (const { rowNumber, row } of rows) {
          const code = accept(rowNumber, row, 'subsidiary');
          if (code === null) continue;
          const id = (row.id as string | null) ?? shortId(def.idPrefix);
          const prior = existing.get(id);
          if (!ownership(rowNumber, prior ? prior.subsidiary : undefined)) continue;
          if (row.status === 'Closed' && !row.closureDate) {
            this.warn(result, { row: rowNumber, column: 'Closure Date', code: 'MISSING_CLOSURE_DATE', message: 'Closed incident without a closure date' });
          }
          record(!prior, CbzIncident, {
            ...(prior ?? {}),
            id,
            subsidiary: code,
            dateReported: row.dateReported as string,
            category: row.category as string,
            description: row.description as string,
            severity: row.severity as string,
            status: row.status as string,
            correctiveAction: (row.correctiveAction as string | null) ?? '',
            closureDate: (row.closureDate as string | null) ?? null,
          }, code);
        }
        break;
      }

      case 'ingestionLog': {
        const existing = await this.existingById(this.ingestion, ids);
        for (const { rowNumber, row } of rows) {
          const code = accept(rowNumber, row, 'subsidiary');
          if (code === null) continue;
          const id = (row.id as string | null) ?? shortId(def.idPrefix);
          const prior = existing.get(id);
          if (!ownership(rowNumber, prior ? prior.subsidiary : undefined)) continue;
          record(!prior, CbzIngestionBatch, {
            ...(prior ?? {}),
            id,
            fileName: row.fileName as string,
            channel: row.channel as string,
            subsidiary: code,
            uploadedAt: row.uploadedAt as Date,
            recordsProcessed: row.records as number,
            validationStatus: row.validationStatus as string,
            errorDetails: (row.errorDetails as string | null) ?? 'n/a',
            notificationSent: (row.notificationSent as boolean | null) ?? false,
          }, code);
        }
        break;
      }

      case 'risks': {
        const existing = await this.existingById(this.risks, ids);
        const groupCode = 'GROUP';
        for (const { rowNumber, row } of rows) {
          const linked = String(row.linkedEntity).toUpperCase();
          const isGroup = linked === groupCode;
          if (isGroup && !BANK_WIDE_ROLES.has(ctx.caller.role)) {
            this.reject(result, [{ row: rowNumber, column: 'Linked Entity', code: 'OUT_OF_SCOPE', message: 'Only bank admins and approvers can add Group-level risks' }]);
            continue;
          }
          const code = accept(rowNumber, isGroup ? { ...row, linkedEntity: null } : row, isGroup ? null : 'linkedEntity');
          if (code === null) continue;
          const id = (row.id as string | null) ?? shortId(def.idPrefix);
          const prior = existing.get(id);
          if (prior && prior.bankId !== ctx.bank.id) {
            this.reject(result, [{ row: rowNumber, column: idCol, code: 'ID_CONFLICT', message: 'This ID is already used by another organisation; give the row a different ID' }]);
            continue;
          }
          const likelihood = row.likelihood as number;
          const impact = row.impact as number;
          if (likelihood < 1 || likelihood > 5 || impact < 1 || impact > 5) {
            this.reject(result, [{ row: rowNumber, code: 'INVALID_VALUE', message: 'Likelihood and impact must be 1 to 5' }]);
            continue;
          }
          record(!prior, CbzRiskEntry, {
            ...(prior ?? {}),
            id,
            title: row.title as string,
            category: row.category as string,
            likelihood,
            impact,
            owner: row.owner as string,
            status: row.status as string,
            linkedEntity: isGroup ? groupCode : linked,
            bankId: ctx.bank.id,
          }, isGroup ? '' : linked);
        }
        break;
      }
    }
  }

  // ── Commit ────────────────────────────────────────────────────────────────
  private async commit(plans: SheetPlan[], ctx: Ctx, multiSheet: boolean) {
    const stamp = new Date();
    const batchPrefix = `IMP-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const fallbackCode = ctx.caller.entityCode ?? [...ctx.bankCodes][0];

    await this.dataSource.transaction(async (manager: EntityManager) => {
      let n = 0;
      for (const plan of plans) {
        const { result } = plan;
        if (!result.dataset || result.totalRows === 0) continue;

        // Save grouped by entity type, preserving first-appearance order (counterparties before positions).
        const groups = new Map<EntityTarget<ObjectLiteral>, ObjectLiteral[]>();
        for (const w of plan.writes) {
          if (!groups.has(w.target)) groups.set(w.target, []);
          groups.get(w.target)!.push(w.data);
        }
        for (const [target, rows] of groups) {
          const deduped = [...new Map(rows.map((r) => [String(r.id), r])).values()];
          await manager.save(target, deduped, { chunk: 200 });
        }

        n++;
        const batchId = `${batchPrefix}-${n}`;
        const subsidiary = mostCommon(plan.subsidiaries.filter(Boolean)) ?? fallbackCode;
        const status = result.rejected === 0 ? 'Success' : result.validRows === 0 ? 'Failure' : 'Partial';
        const summary =
          result.rejected === 0
            ? 'n/a'
            : `${result.rejected} row(s) rejected: ${result.errors.slice(0, 3).map((e) => `row ${e.row} ${e.message}`).join('; ')}`;
        const fileLabel = (multiSheet ? `${ctx.fileName} › ${result.sheet}` : ctx.fileName).slice(0, 255);
        if (subsidiary) {
          await manager.save(CbzIngestionBatch, {
            id: batchId,
            fileName: fileLabel,
            channel: 'File Ingester (manual upload)',
            subsidiary,
            uploadedAt: stamp,
            recordsProcessed: result.validRows,
            validationStatus: status,
            errorDetails: summary,
            notificationSent: false,
          });
        }
        await manager.save(CbzAuditLog, {
          id: `${batchId}-A`,
          timestamp: stamp,
          actor: ctx.caller.actorName,
          action: 'IMPORT',
          entityCode: subsidiary || 'GROUP',
          targetType: 'Ingestion',
          targetId: batchId,
          detail: `${result.label}: ${result.toCreate} new, ${result.toUpdate} updated, ${result.rejected} rejected from ${fileLabel}`,
          bankId: ctx.bank.id,
        });
        result.batchId = batchId;
        result.status = result.validRows === 0 ? 'failed' : result.rejected ? 'partial' : 'imported';
      }
    });
  }
}

// ── Header matching & value coercion ─────────────────────────────────────────

function matchHeaders(cells: CellValue[], columns: ColumnDef[]): Map<string, number> {
  const map = new Map<string, number>();
  const used = new Set<number>();
  const names = (c: ColumnDef) => [c.header, ...(c.aliases ?? [])];
  cells.forEach((cell, i) => {
    if (typeof cell !== 'string') return;
    const n = norm(cell);
    const col = columns.find((c) => !map.has(c.key) && names(c).some((h) => norm(h) === n));
    if (col) {
      map.set(col.key, i);
      used.add(i);
    }
  });
  // Second pass ignores bracketed units, e.g. "Borrower / Issuer (fictional)" vs "Borrower / Issuer (name)",
  // but only when exactly one column could match.
  cells.forEach((cell, i) => {
    if (used.has(i) || typeof cell !== 'string') return;
    const n = normLoose(cell);
    if (!n) return;
    const candidates = columns.filter((c) => !map.has(c.key) && names(c).some((h) => normLoose(h) === n));
    if (candidates.length === 1) {
      map.set(candidates[0].key, i);
      used.add(i);
    }
  });
  return map;
}

/** "n/a", "n/a — flat factor used", "none", or a cell of only dashes. Never matches a negative number. */
const EMPTY_MARKER = /^(?:(?:n\/a|na|none|nil|null)(?:\b.*)?|[-—–]+)$/i;

type Coerced = { value: unknown } | { error: string; code: string };

function coerce(col: ColumnDef, raw: CellValue): Coerced {
  const isText = col.type === 'string';
  let value: CellValue = raw;
  if (typeof value === 'string') {
    value = value.trim();
    if (value === '' || (!isText && EMPTY_MARKER.test(value))) value = null;
  }
  if (value === null) {
    return col.required ? { code: 'MISSING_FIELD', error: `${col.header} is required` } : { value: null };
  }

  switch (col.type) {
    case 'string': {
      let text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
      if (col.options) {
        const match = col.options.find((o) => norm(o) === norm(text));
        if (!match) return { code: 'INVALID_VALUE', error: `${col.header} must be one of: ${dedupe(col.options).join(', ')}` };
        text = match;
      }
      if (col.maxLength && text.length > col.maxLength) return { code: 'TOO_LONG', error: `${col.header} can be at most ${col.maxLength} characters` };
      return { value: text };
    }
    case 'number':
    case 'int':
    case 'percent': {
      let num: number;
      if (typeof value === 'number') num = value;
      else if (typeof value === 'boolean' || value instanceof Date) return { code: 'INVALID_NUMBER', error: `${col.header} must be a number` };
      else {
        const text = value.replace(/US\$|\$|,|\s/g, '');
        const percent = text.endsWith('%');
        num = Number(percent ? text.slice(0, -1) : text);
        if (percent) num /= 100;
      }
      if (!Number.isFinite(num)) return { code: 'INVALID_NUMBER', error: `${col.header} must be a number (got '${value}')` };
      if (col.type === 'int') {
        if (!Number.isInteger(num)) return { code: 'INVALID_NUMBER', error: `${col.header} must be a whole number` };
      }
      if (col.type === 'percent') {
        if (num > 1 && num <= 100) num /= 100; // 48 means 48%
        if (num < 0 || num > 1) return { code: 'INVALID_NUMBER', error: `${col.header} must be a share between 0 and 1 (or 0–100%)` };
      }
      return { value: num };
    }
    case 'period': {
      const period = value instanceof Date ? `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}` : parsePeriod(String(value));
      return period ? { value: period } : { code: 'INVALID_PERIOD', error: `${col.header} must look like 2026-08, 2026-Q3 or 2026 (got '${value}')` };
    }
    case 'date': {
      const date = value instanceof Date ? value.toISOString().slice(0, 10) : parseDate(String(value));
      return date ? { value: date } : { code: 'INVALID_DATE', error: `${col.header} must be a date like 2026-07-15 (got '${value}')` };
    }
    case 'datetime': {
      if (value instanceof Date) return { value };
      const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2})(?::(\d{2}))?)?$/.exec(String(value).trim());
      if (!m) return { code: 'INVALID_DATE', error: `${col.header} must look like 2026-09-02 08:14 (got '${value}')` };
      // Local times in the sheet are Zimbabwe time (CAT, UTC+2).
      const parsed = new Date(`${m[1]}T${m[2] ? m[2].padStart(5, '0') : '00:00'}:${m[3] ?? '00'}+02:00`);
      return Number.isNaN(parsed.getTime()) ? { code: 'INVALID_DATE', error: `${col.header} is not a real date` } : { value: parsed };
    }
    case 'bool': {
      if (typeof value === 'boolean') return { value };
      const text = norm(String(value));
      if (['yes', 'y', 'true', '1'].includes(text)) return { value: true };
      if (['no', 'n', 'false', '0'].includes(text)) return { value: false };
      return { code: 'INVALID_VALUE', error: `${col.header} must be Yes or No` };
    }
  }
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2026-8" → "2026-08", "Sept 2026" / "Aug-26" → month, "2026-q3" / "Q3 2026" → "2026-Q3", "2026" stays (annual). */
export function parsePeriod(text: string): string | null {
  const t = text.trim().toUpperCase();
  const named = /^([A-Z]{3,9})[-\s/]*(\d{2}|\d{4})$/.exec(t);
  if (named) {
    const month = MONTHS.indexOf(named[1].slice(0, 3));
    if (month >= 0) return `${named[2].length === 2 ? `20${named[2]}` : named[2]}-${pad(month + 1)}`;
  }
  let m = /^(\d{4})[-/](\d{1,2})$/.exec(t);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return `${m[1]}-${pad(Number(m[2]))}`;
  m = /^(\d{4})[-\s]?Q([1-4])$/.exec(t);
  if (m) return `${m[1]}-Q${m[2]}`;
  m = /^Q([1-4])[-\s]?(\d{4})$/.exec(t);
  if (m) return `${m[2]}-Q${m[1]}`;
  if (/^\d{4}$/.test(t)) return t;
  return null;
}

function parseDate(text: string): string | null {
  const t = text.trim();
  let y: number, mo: number, d: number;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]; // day-first, as in Zimbabwe
  else return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** Source files follow <CODE>_<DATASET>_<YYYY-MM | YYYY-Q#>_v<N>.<ext>; take the period from the name. */
function periodFromFileName(name: string | null): string | null {
  if (!name) return null;
  const m = /_(\d{4}-(?:Q[1-4]|\d{2}))(?:-\d{2})?_/i.exec(name);
  return m ? parsePeriod(m[1]) : null;
}

function matchAssetClass(text: string): string | null {
  const n = norm(text);
  for (const [key, label] of Object.entries(ASSET_CLASSES)) {
    if (norm(key) === n || norm(label) === n) return key;
  }
  return null;
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  for (const [v, c] of counts) if (!best || c > counts.get(best)!) best = v;
  return best;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function round(value: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
