import * as ExcelJS from 'exceljs';
import { ASSET_CLASSES, DATASETS, INFO_SHEETS } from './import-datasets';

const SUBSIDIARY_KEYS = new Set(['subsidiary', 'linkedEntity']);

/**
 * The upload template: same layout as the CBZ ESG Sample Dataset (title in row 1, headers in
 * row 2, data from row 3), one sheet per importable dataset, with drop-downs for the bank's own
 * subsidiary codes and every fixed list of values.
 */
export async function buildImportTemplate(bankName: string, entities: Array<{ code: string; name: string }>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MAvHU ESG Platform';
  wb.created = new Date();

  const readme = wb.addWorksheet('README');
  readme.columns = [{ width: 28 }, { width: 70 }, { width: 70 }];
  readme.addRow([`MAvHU ESG bulk import template — ${bankName}`]).font = { bold: true, size: 14 };
  readme.addRow([]);
  for (const line of [
    ['How it works', 'Fill in any of the sheets below (leave the rest empty) and upload the workbook in Data entry → Bulk import. A CSV of a single sheet also works.'],
    ['Layout', 'Keep the title in row 1 and the column headers in row 2. Data starts in row 3. Do not rename the headers.'],
    ['Validate first', 'Upload runs a validation pass first: you see every rejected row with the reason before anything is saved.'],
    ['Re-uploading', 'Rows are matched on their ID column: an existing ID is updated, a new ID is created. Approved or locked records cannot be overwritten.'],
    ['Periods', 'Use YYYY-MM (2026-08), YYYY-Q# (2026-Q3) or YYYY. Periods locked by the MAvHU team are rejected.'],
    ['Calculations', 'Emissions, attribution factors and financed emissions are recalculated by the platform; where your sheet differs by more than 1% you get a warning.'],
    ['Your subsidiary codes', entities.map((e) => `${e.code} (${e.name})`).join(', ') || 'None yet: ask the MAvHU team to add your subsidiaries.'],
  ]) {
    const row = readme.addRow(line);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  }
  readme.addRow([]);
  const head = readme.addRow(['Sheet', 'Contents', 'Required columns']);
  head.font = { bold: true };
  for (const def of DATASETS.filter((d) => d.key !== 'emissionsSimple')) {
    const row = readme.addRow([def.sheet, def.label, def.columns.filter((c) => c.required).map((c) => c.header).join(', ')]);
    row.alignment = { wrapText: true, vertical: 'top' };
  }
  for (const info of INFO_SHEETS.filter((s) => s.signature.length)) {
    readme.addRow([info.sheet, `Not imported: ${info.reason}`, '']).alignment = { wrapText: true, vertical: 'top' };
  }

  // Drop-down sources live on a hidden sheet: Excel caps inline list validations at 255 characters.
  const lists = wb.addWorksheet('Lists', { state: 'veryHidden' });
  let listCol = 0;
  const listRange = (values: string[]): string => {
    listCol++;
    const letter = lists.getColumn(listCol).letter;
    values.forEach((v, i) => (lists.getCell(`${letter}${i + 1}`).value = v));
    return `Lists!$${letter}$1:$${letter}$${Math.max(values.length, 1)}`;
  };
  const subsidiaryRange = listRange(entities.map((e) => e.code));
  const groupRange = listRange(['GROUP', ...entities.map((e) => e.code)]);

  for (const def of DATASETS.filter((d) => d.key !== 'emissionsSimple')) {
    const ws = wb.addWorksheet(def.sheet, { views: [{ state: 'frozen', ySplit: 2 }] });
    ws.getCell('A1').value = def.title;
    ws.getCell('A1').font = { bold: true, size: 12 };
    const header = ws.getRow(2);
    def.columns.forEach((col, i) => {
      const cell = header.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: col.required ? 'FFFFFFFF' : 'FF1F2937' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.required ? 'FF1E3A5F' : 'FFE5E7EB' } };
      cell.alignment = { wrapText: true, vertical: 'middle' };
      ws.getColumn(i + 1).width = Math.min(Math.max(col.header.length + 4, 14), 40);

      let range: string | null = null;
      if (SUBSIDIARY_KEYS.has(col.key)) range = col.key === 'linkedEntity' ? groupRange : subsidiaryRange;
      else if (col.key === 'assetClass') range = listRange(Object.values(ASSET_CLASSES));
      else if (col.options) range = listRange(col.options);
      else if (col.type === 'bool') range = listRange(['Yes', 'No']);
      if (range) {
        for (let r = 3; r <= 500; r++) {
          ws.getCell(r, i + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [range], showErrorMessage: true, error: 'Pick a value from the list' };
        }
      }
    });
    header.height = 32;
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
