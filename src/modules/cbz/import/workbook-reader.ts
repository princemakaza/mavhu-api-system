import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export type CellValue = string | number | boolean | Date | null;

export interface RawSheet {
  name: string;
  /** rowNumber is the 1-based row as the user sees it in Excel or a text editor. */
  rows: Array<{ rowNumber: number; cells: CellValue[] }>;
}

export const MAX_ROWS_PER_FILE = 20_000;

/** Reads an .xlsx workbook or a .csv file into plain rows, whatever the source. */
export async function readUpload(buffer: Buffer, fileName: string): Promise<RawSheet[]> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return [{ name: fileName.replace(/\.[^.]+$/, ''), rows: parseCsv(buffer.toString('utf8')) }];
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) {
    return readXlsx(buffer);
  }
  if (lower.endsWith('.xls')) {
    throw new BadRequestException('Old .xls files are not supported. In Excel use File → Save As → Excel Workbook (.xlsx), or CSV.');
  }
  throw new BadRequestException('Upload an Excel workbook (.xlsx) or a CSV file.');
}

async function readXlsx(buffer: Buffer): Promise<RawSheet[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs' Buffer typing predates Node's generic Buffer type.
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new BadRequestException('This file could not be opened as an Excel workbook. Check it is a valid .xlsx file.');
  }

  let total = 0;
  const sheets: RawSheet[] = [];
  workbook.eachSheet((worksheet) => {
    const rows: RawSheet['rows'] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // row.values is 1-indexed; drop the empty slot at index 0.
      const values = (row.values as unknown[]).slice(1).map(normaliseCell);
      if (values.some((v) => v !== null && v !== '')) rows.push({ rowNumber, cells: values });
    });
    total += rows.length;
    sheets.push({ name: worksheet.name, rows });
  });
  if (total > MAX_ROWS_PER_FILE) {
    throw new BadRequestException(`This file has ${total} rows; split it into files of at most ${MAX_ROWS_PER_FILE} rows.`);
  }
  return sheets;
}

/** Flattens exceljs cell objects (formulas, rich text, hyperlinks, errors) to plain values. */
function normaliseCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) return value;
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if ('result' in v) return normaliseCell(v.result);
    if (Array.isArray(v.richText)) return normaliseCell((v.richText as Array<{ text: string }>).map((t) => t.text).join(''));
    if ('text' in v) return normaliseCell(v.text);
    if ('error' in v) return null;
  }
  return String(value);
}

/** RFC 4180 CSV with quoted fields; detects ';' (European Excel) vs ','. Values stay as text. */
export function parseCsv(text: string): RawSheet['rows'] {
  const source = text.replace(/^﻿/, '');
  const firstLine = source.slice(0, source.search(/\r?\n/) === -1 ? undefined : source.search(/\r?\n/));
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows: RawSheet['rows'] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let rowStart = 1;

  const pushRow = () => {
    row.push(field);
    field = '';
    const cells = row.map((c) => (c.trim() === '' ? null : c.trim()));
    if (cells.some((c) => c !== null)) rows.push({ rowNumber: rowStart, cells });
    row = [];
  };

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        if (ch === '\n') line++;
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      pushRow();
      line++;
      rowStart = line;
    } else {
      field += ch;
    }
    if (rows.length > MAX_ROWS_PER_FILE) {
      throw new BadRequestException(`This CSV has more than ${MAX_ROWS_PER_FILE} rows; split it into smaller files.`);
    }
  }
  if (field !== '' || row.length) pushRow();
  return rows;
}
