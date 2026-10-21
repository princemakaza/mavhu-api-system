import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';
import { DataSource, Repository } from 'typeorm';
import { stableStringify } from '../../common/stable-json';
import { Bank } from '../banks/entities/bank.entity';
import { AuditTrailService } from './audit-trail.service';
import { CallerContext } from './cbz.service';
import { CbzDisclosure } from './entities/cbz-disclosure.entity';
import { assertCan } from './role-policy';

export const FRAMEWORKS = ['IFRS S2', 'IFRS S1', 'GRI', 'TCFD', 'SASB', 'PCAF', 'SDG', 'TNFD', 'RBZ', 'ZSE', 'EMA', 'IPEC', 'SECZim'];

export interface DisclosureRow {
  code: string;
  label: string;
  value: number | string | null;
  unit: string;
  reference: string;
  pillar?: string;
  status: 'Reported' | 'Not available' | 'Narrative';
  basis?: string;
  sources?: number;
}

/**
 * Published disclosures (F44/F45). The bank builds a framework index from approved data in the
 * dashboard; publishing freezes it as an immutable, hashed version. Only published versions are
 * exported or distributed.
 */
@Injectable()
export class DisclosuresService {
  constructor(
    @InjectRepository(CbzDisclosure) private readonly disclosures: Repository<CbzDisclosure>,
    @InjectRepository(Bank) private readonly banks: Repository<Bank>,
    private readonly auditTrail: AuditTrailService,
    private readonly dataSource: DataSource,
  ) {}

  list(caller: CallerContext) {
    return this.disclosures.find({
      where: { bankId: caller.scope.bankId },
      select: { id: true, framework: true, period: true, version: true, title: true, hash: true, publishedBy: true, publishedAt: true },
      order: { publishedAt: 'DESC' },
    });
  }

  async get(caller: CallerContext, id: string) {
    const row = await this.disclosures.findOne({ where: { id, bankId: caller.scope.bankId } });
    if (!row) throw new NotFoundException(`Disclosure ${id} not found`);
    const intact = createHash('sha256').update(stableStringify(row.snapshot)).digest('hex') === row.hash;
    return { ...row, intact };
  }

  async publish(caller: CallerContext, body: { framework: string; period: string; title?: string; rows: DisclosureRow[]; notes?: string }) {
    assertCan(caller, 'publish', 'publish disclosures');
    if (!FRAMEWORKS.includes(body.framework)) throw new BadRequestException(`Framework must be one of: ${FRAMEWORKS.join(', ')}`);
    if (!/^\d{4}(-(0[1-9]|1[0-2]|Q[1-4]))?$/.test(body.period ?? '')) throw new BadRequestException('Period must look like 2026, 2026-Q3 or 2026-08');
    if (!Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > 500) throw new BadRequestException('A disclosure needs 1 to 500 rows');
    const rows = body.rows.map((r, i) => {
      if (!r || typeof r.code !== 'string' || typeof r.label !== 'string') throw new BadRequestException(`Row ${i + 1} needs a code and a label`);
      const value = typeof r.value === 'number' && Number.isFinite(r.value) ? r.value : typeof r.value === 'string' ? r.value.slice(0, 2000) : null;
      return {
        code: r.code.slice(0, 60),
        label: r.label.slice(0, 255),
        value,
        unit: String(r.unit ?? '').slice(0, 40),
        reference: String(r.reference ?? '').slice(0, 255),
        pillar: String(r.pillar ?? '').slice(0, 40),
        status: value === null ? 'Not available' : typeof value === 'string' ? 'Narrative' : 'Reported',
        basis: String(r.basis ?? '').slice(0, 255),
        sources: Number.isInteger(r.sources) ? r.sources : 0,
      };
    });
    const bank = await this.banks.findOneOrFail({ where: { id: caller.scope.bankId } });

    return this.dataSource.transaction(async (m) => {
      const last: Array<{ version: number }> = await m.query(
        'SELECT coalesce(max(version), 0) AS version FROM mavhu.cbz_disclosures WHERE bank_id = $1 AND framework = $2 AND period = $3',
        [bank.id, body.framework, body.period],
      );
      const version = Number(last[0]?.version ?? 0) + 1;
      const reported = rows.filter((r) => r.status !== 'Not available').length;
      const snapshot = {
        bank: bank.name,
        framework: body.framework,
        period: body.period,
        version,
        title: (body.title?.trim() || `${bank.name} ${body.framework} disclosure ${body.period}`).slice(0, 255),
        basis: 'Approved and locked records only',
        completeness: rows.length ? reported / rows.length : 0,
        notes: (body.notes ?? '').slice(0, 2000),
        publishedBy: caller.actorName,
        rows,
      };
      const hash = createHash('sha256').update(stableStringify(snapshot)).digest('hex');
      const saved = await m.save(CbzDisclosure, m.create(CbzDisclosure, {
        id: randomUUID(),
        bankId: bank.id,
        framework: body.framework,
        period: body.period,
        version,
        title: snapshot.title,
        snapshot,
        hash,
        publishedBy: caller.actorName,
        publishedAt: new Date(),
      }));
      await this.auditTrail.record({
        bankId: bank.id, actor: caller.actorName, action: 'PUBLISH', entityCode: 'GROUP', targetType: 'Disclosure', targetId: saved.id,
        detail: `Published ${body.framework} ${body.period} v${version} (${reported}/${rows.length} items reported, sha256 ${hash.slice(0, 12)}…)`,
      }, m);
      return saved;
    });
  }

  /** Renders a published version. Formats: xlsx, csv, doc (Word), json; PDF is printed from the UI. */
  async export(caller: CallerContext, id: string, format: string): Promise<{ buffer: Buffer; fileName: string; type: string }> {
    const d = await this.get(caller, id);
    const snap = d.snapshot as { bank: string; title: string; framework: string; period: string; version: number; basis: string; completeness: number; rows: DisclosureRow[] };
    const base = `${snap.bank}_${snap.framework}_${snap.period}_v${snap.version}`.replace(/[^A-Za-z0-9_-]+/g, '_');
    const header = ['Code', 'Disclosure item', 'Reference', 'Value', 'Unit', 'Status', 'Basis', 'Evidence files'];
    const lines = snap.rows.map((r) => [r.code, r.label, r.reference, r.value ?? '', r.unit, r.status, r.basis ?? '', r.sources ?? 0]);

    if (format === 'json') {
      return { buffer: Buffer.from(JSON.stringify({ ...snap, sha256: d.hash, publishedAt: d.publishedAt }, null, 2)), fileName: `${base}.json`, type: 'application/json' };
    }
    if (format === 'csv') {
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [header, ...lines].map((row) => row.map(esc).join(',')).join('\r\n');
      return { buffer: Buffer.from(`﻿${csv}`), fileName: `${base}.csv`, type: 'text/csv; charset=utf-8' };
    }
    if (format === 'doc') {
      const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const html = `<html><head><meta charset="utf-8"><title>${esc(snap.title)}</title></head><body style="font-family:Calibri,Arial">
<h1>${esc(snap.title)}</h1>
<p>Framework: ${esc(snap.framework)} · Period: ${esc(snap.period)} · Version ${snap.version} · Published ${esc(new Date(d.publishedAt).toISOString().slice(0, 10))} by ${esc(d.publishedBy)}</p>
<p>Basis: ${esc(snap.basis)}. Completeness ${(snap.completeness * 100).toFixed(0)}%. Integrity hash (SHA-256): ${esc(d.hash)}</p>
<table border="1" cellspacing="0" cellpadding="4"><tr>${header.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>
${lines.map((l) => `<tr>${l.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('\n')}</table></body></html>`;
      return { buffer: Buffer.from(html), fileName: `${base}.doc`, type: 'application/msword' };
    }
    if (format === 'xlsx') {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'MAvHU ESG Platform';
      const ws = wb.addWorksheet(snap.framework.slice(0, 31));
      ws.addRow([snap.title]).font = { bold: true, size: 14 };
      ws.addRow([`Period ${snap.period} · version ${snap.version} · published ${new Date(d.publishedAt).toISOString().slice(0, 10)} by ${d.publishedBy}`]);
      ws.addRow([`Basis: ${snap.basis} · completeness ${(snap.completeness * 100).toFixed(0)}% · SHA-256 ${d.hash}`]);
      ws.addRow([]);
      const h = ws.addRow(header);
      h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      h.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B4F6C' } }));
      lines.forEach((l) => ws.addRow(l));
      ws.columns = [{ width: 18 }, { width: 52 }, { width: 26 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 30 }, { width: 14 }];
      return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), fileName: `${base}.xlsx`, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }
    throw new BadRequestException('format must be xlsx, csv, doc or json (print the PDF from the dashboard)');
  }
}
