/**
 * Datasets the bulk importer understands. Sheet names and column headers follow the
 * "CBZ ESG Sample Dataset" workbook (one sheet per dataset, a title in row 1 and headers in
 * row 2), so the same layout works for every bank. A CSV holding a single sheet is recognised
 * by its headers.
 */

export type FieldType = 'string' | 'number' | 'int' | 'percent' | 'period' | 'date' | 'datetime' | 'bool';

export interface ColumnDef {
  key: string;
  header: string;
  aliases?: string[];
  type: FieldType;
  required?: boolean;
  /** Allowed values, matched case- and punctuation-insensitively; stored as written here. */
  options?: string[];
  maxLength?: number;
}

export type DatasetKey =
  | 'scope1'
  | 'scope2'
  | 'scope3'
  | 'emissionsSimple'
  | 'financed'
  | 'insurance'
  | 'geospatial'
  | 'financialInclusion'
  | 'workforce'
  | 'incidents'
  | 'ingestionLog'
  | 'risks';

export interface DatasetDef {
  key: DatasetKey;
  label: string;
  sheet: string;
  title: string;
  /** Max length of the record id column in the database. */
  idMax: number;
  idPrefix: string;
  /** Whether rows carry a reporting period that a MAvHU period lock can freeze. */
  periodLocked: boolean;
  columns: ColumnDef[];
}

/** Sheets that are recognised but not imported, with the reason shown to the user. */
export interface InfoSheetDef {
  sheet: string;
  reason: string;
  /** Headers that identify the sheet when it arrives as a CSV. */
  signature: string[];
}

export const ASSET_CLASSES: Record<string, string> = {
  business_loans_unlisted_equity: 'Business loans & unlisted equity',
  business_loans_listed: 'Business loans — listed borrower',
  project_finance: 'Project finance',
  commercial_real_estate: 'Commercial real estate',
  mortgages: 'Mortgages',
  motor_vehicle_loans: 'Motor vehicle loans',
  listed_equity_corporate_bonds: 'Listed equity & corporate bonds',
  sovereign_debt: 'Sovereign debt',
  sub_sovereign_debt: 'Sub-sovereign debt',
  use_of_proceeds: 'Use of proceeds structures',
};

/** The PCAF denominator each asset class divides by (mirrors the frontend's ASSET_CLASS_DENOMINATOR). */
export const ASSET_CLASS_DENOMINATOR: Record<string, string> = {
  business_loans_unlisted_equity: 'totalEquityDebt',
  business_loans_listed: 'evic',
  project_finance: 'projectTotalCost',
  commercial_real_estate: 'propertyValue',
  mortgages: 'propertyValue',
  motor_vehicle_loans: 'vehicleValue',
  listed_equity_corporate_bonds: 'evic',
  sovereign_debt: 'gdpPpp',
  sub_sovereign_debt: 'regionalGdpPpp',
  use_of_proceeds: 'uopStructureValue',
};

/** Short labels for Scope 3 categories, matching how the seeded records are named ("Cat 1 - Procurement"). */
export const SCOPE3_CATEGORY_LABELS: Record<string, string> = {
  'Cat 1': 'Procurement',
  'Cat 2': 'Capital goods',
  'Cat 3': 'Fuel & energy (T&D losses)',
  'Cat 4': 'Upstream transport',
  'Cat 5': 'Waste',
  'Cat 6': 'Business travel',
  'Cat 7': 'Employee commuting',
  'Cat 8': 'Upstream leased assets',
  'Cat 9': 'Downstream transport',
  'Cat 10': 'Processing of sold products',
  'Cat 11': 'Use of sold products',
  'Cat 12': 'End-of-life of sold products',
  'Cat 13': 'Downstream leased assets',
  'Cat 14': 'Franchises',
  'Cat 15': 'Investments',
};

const SOURCE_FILE: ColumnDef = { key: 'sourceFile', header: 'Source File', aliases: ['Ingestion File', 'Source Reference'], type: 'string', maxLength: 255 };
const SUBSIDIARY: ColumnDef = { key: 'subsidiary', header: 'Subsidiary', aliases: ['Entity Code', 'Subsidiary Code'], type: 'string', required: true };
const PERIOD: ColumnDef = { key: 'period', header: 'Period', aliases: ['Reporting Period'], type: 'period', required: true };
const DQ_OPTIONAL: ColumnDef = { key: 'dataQuality', header: 'Data Quality (1-5)', aliases: ['Data Quality Score (1-5)', 'Data Quality Score', 'DQ Score'], type: 'int' };
const METHODS = ['measured', 'calculated', 'estimated', 'spend-based', 'activity-based'];

export const DATASETS: DatasetDef[] = [
  {
    key: 'scope1',
    label: 'Scope 1 — direct emissions',
    sheet: 'Scope 1 - Direct',
    title: '1. Scope 1 — Direct Emissions',
    idMax: 40,
    idPrefix: 'S1',
    periodLocked: true,
    columns: [
      { key: 'id', header: 'Record ID', type: 'string' },
      SUBSIDIARY,
      { key: 'site', header: 'Site/Branch', aliases: ['Site'], type: 'string', required: true, maxLength: 255 },
      PERIOD,
      { key: 'datasetType', header: 'Dataset Type', type: 'string', required: true, maxLength: 100 },
      { key: 'fuelType', header: 'Fuel/Refrigerant Type', aliases: ['Fuel Type'], type: 'string', maxLength: 50 },
      { key: 'activity', header: 'Activity Data', type: 'number', required: true },
      { key: 'unit', header: 'Unit', type: 'string', required: true, maxLength: 50 },
      { key: 'factor', header: 'Emission Factor (kgCO2e/unit)', aliases: ['Emission Factor'], type: 'number', required: true },
      { key: 'emissionsKg', header: 'Emissions (kgCO2e)', type: 'number' },
      { key: 'emissionsT', header: 'Emissions (tCO2e)', type: 'number' },
      { key: 'method', header: 'Method', type: 'string', options: METHODS },
      DQ_OPTIONAL,
      SOURCE_FILE,
    ],
  },
  {
    key: 'scope2',
    label: 'Scope 2 — purchased energy',
    sheet: 'Scope 2 - Energy',
    title: '2. Scope 2 — Purchased Energy (location-based is stored; market-based is checked only)',
    idMax: 40,
    idPrefix: 'S2',
    periodLocked: true,
    columns: [
      { key: 'id', header: 'Record ID', type: 'string' },
      SUBSIDIARY,
      { key: 'site', header: 'Site', aliases: ['Site/Branch'], type: 'string', required: true, maxLength: 255 },
      PERIOD,
      { key: 'kwh', header: 'Grid Electricity (kWh)', type: 'number', required: true },
      { key: 'factor', header: 'Location-based Factor (kgCO2e/kWh)', type: 'number', required: true },
      { key: 'emissionsT', header: 'Location-based Emissions (tCO2e)', type: 'number' },
      { key: 'solarKwh', header: 'On-site Solar Generated (kWh)', type: 'number' },
      { key: 'marketFactor', header: 'Market-based Residual Mix Factor (kgCO2e/kWh)', type: 'number' },
      { key: 'marketEmissionsT', header: 'Market-based Emissions (tCO2e)', type: 'number' },
      DQ_OPTIONAL,
      SOURCE_FILE,
    ],
  },
  {
    key: 'scope3',
    label: 'Scope 3 — operational categories',
    sheet: 'Scope 3 - Operational',
    title: '3. Scope 3 — Operational Categories',
    idMax: 40,
    idPrefix: 'S3',
    periodLocked: true,
    columns: [
      { key: 'id', header: 'Record ID', type: 'string' },
      SUBSIDIARY,
      { key: 'category', header: 'Category', type: 'string', required: true, options: Object.keys(SCOPE3_CATEGORY_LABELS) },
      { key: 'description', header: 'Description', type: 'string', maxLength: 255 },
      PERIOD,
      { key: 'method', header: 'Method', type: 'string', required: true, options: METHODS },
      { key: 'activity', header: 'Activity/Spend Data', aliases: ['Activity Data', 'Spend Data'], type: 'number', required: true },
      { key: 'unit', header: 'Unit', type: 'string', required: true, maxLength: 50 },
      { key: 'factor', header: 'Emission Factor', aliases: ['Emission Factor (kgCO2e/unit)'], type: 'number', required: true },
      { key: 'emissionsT', header: 'Emissions (tCO2e)', type: 'number' },
      DQ_OPTIONAL,
      SOURCE_FILE,
    ],
  },
  {
    // The earlier dashboard CSV format, kept so files built for it still import.
    key: 'emissionsSimple',
    label: 'Emissions (simple CSV)',
    sheet: 'Emissions',
    title: 'Emissions — one row per activity record',
    idMax: 40,
    idPrefix: 'EM',
    periodLocked: true,
    columns: [
      { key: 'id', header: 'record_id', type: 'string' },
      { key: 'subsidiary', header: 'entity_code', type: 'string', required: true },
      { key: 'site', header: 'site', type: 'string', required: true, maxLength: 255 },
      { key: 'period', header: 'period', type: 'period', required: true },
      { key: 'scope', header: 'scope', type: 'string', required: true, options: ['scope1', 'scope2', 'scope3'] },
      { key: 'datasetType', header: 'dataset_type', type: 'string', required: true, maxLength: 100 },
      { key: 'activity', header: 'activity_data', type: 'number', required: true },
      { key: 'unit', header: 'unit', type: 'string', required: true, maxLength: 50 },
      { key: 'factor', header: 'emission_factor', type: 'number', required: true },
      { key: 'dataQuality', header: 'data_quality', type: 'int', required: true },
      { key: 'method', header: 'method', type: 'string', options: METHODS },
      { key: 'sourceFile', header: 'source_file', type: 'string', maxLength: 255 },
    ],
  },
  {
    key: 'financed',
    label: 'Financed emissions (PCAF Part A)',
    sheet: 'Financed Emissions',
    title: '4. Scope 3 Cat 15 — Financed Emissions (PCAF Part A)',
    idMax: 40,
    idPrefix: 'FE',
    periodLocked: true,
    columns: [
      { key: 'id', header: 'Loan/Investment ID', aliases: ['Loan ID', 'Position ID'], type: 'string' },
      { key: 'assetClass', header: 'Asset Class', type: 'string', required: true, options: [...Object.values(ASSET_CLASSES), ...Object.keys(ASSET_CLASSES)] },
      SUBSIDIARY,
      { key: 'borrower', header: 'Borrower / Issuer (fictional)', aliases: ['Borrower / Issuer', 'Borrower', 'Issuer'], type: 'string', required: true, maxLength: 255 },
      { key: 'sector', header: 'Sector', type: 'string', required: true, maxLength: 100 },
      { key: 'listedStatus', header: 'Listed Status', type: 'string', required: true, options: ['Listed', 'Unlisted', 'Sovereign', 'Sub-sovereign', 'n/a'] },
      { key: 'outstanding', header: 'Outstanding Amount (US$)', type: 'number', required: true },
      { key: 'denominatorType', header: 'Denominator Type', type: 'string' },
      { key: 'denominator', header: 'Denominator Value (US$)', type: 'number', required: true },
      { key: 'attribution', header: 'Attribution Factor', type: 'number' },
      { key: 'borrowerEmissions', header: 'Borrower/Issuer Total Emissions (tCO2e)', aliases: ['Borrower Total Emissions (tCO2e)'], type: 'number', required: true },
      { key: 'financedEmissions', header: 'Financed Emissions (tCO2e)', type: 'number' },
      { key: 'dataQuality', header: 'Data Quality Score (1-5)', aliases: ['Data Quality Score', 'Data Quality (1-5)'], type: 'int', required: true },
      { key: 'mrv', header: 'MAvHU MRV Enhanced', type: 'bool' },
      { key: 'period', header: 'Period', type: 'period' },
      SOURCE_FILE,
    ],
  },
  {
    key: 'insurance',
    label: 'Insurance-associated emissions (PCAF Part C)',
    sheet: 'Insurance Emissions',
    title: '5. Insurance-Associated Emissions (PCAF Part C)',
    idMax: 40,
    idPrefix: 'IE',
    periodLocked: false,
    columns: [
      { key: 'id', header: 'Policy ID', type: 'string' },
      {
        key: 'segment',
        header: 'Segment',
        type: 'string',
        required: true,
        options: ['Commercial lines', 'Personal motor - individual data', 'Personal motor - PCAF fallback factor', 'Project insurance', 'Treaty reinsurance'],
      },
      SUBSIDIARY,
      { key: 'client', header: 'Client (fictional)', aliases: ['Client', 'Client Name'], type: 'string', required: true, maxLength: 255 },
      { key: 'sector', header: 'Sector', type: 'string', required: true, maxLength: 100 },
      { key: 'premium', header: 'Gross Written Premium (US$)', type: 'number', required: true },
      { key: 'denominatorType', header: 'Denominator Type', type: 'string', required: true, maxLength: 255 },
      { key: 'denominator', header: 'Denominator Value (US$)', type: 'number' },
      { key: 'attribution', header: 'Attribution Factor', type: 'number' },
      { key: 'clientEmissions', header: 'Client Total Emissions (tCO2e)', type: 'number', required: true },
      { key: 'associatedEmissions', header: 'Insurance-Associated Emissions (tCO2e)', type: 'number' },
      { key: 'dataQuality', header: 'Data Quality Score', aliases: ['Data Quality Score (1-5)', 'Data Quality (1-5)'], type: 'int', required: true },
      SOURCE_FILE,
    ],
  },
  {
    key: 'geospatial',
    label: 'Satellite & geospatial',
    sheet: 'Satellite-Geospatial',
    title: '9. Satellite & Geospatial Data',
    idMax: 20,
    idPrefix: 'GEO',
    periodLocked: false,
    columns: [
      { key: 'id', header: 'Record ID', type: 'string' },
      { key: 'borrower', header: 'Linked Borrower/Site', type: 'string', required: true, maxLength: 255 },
      { key: 'subsidiary', header: 'Subsidiary Portfolio', aliases: ['Subsidiary'], type: 'string', required: true },
      { key: 'district', header: 'District', type: 'string', required: true, maxLength: 100 },
      { key: 'coordinates', header: 'Approx. Coordinates', aliases: ['Coordinates'], type: 'string', required: true, maxLength: 50 },
      { key: 'passDate', header: 'Satellite Pass Date', aliases: ['Pass Date'], type: 'date', required: true },
      { key: 'dataSource', header: 'Data Source', type: 'string', required: true, options: ['Sentinel-2', 'Landsat-9', 'MODIS'] },
      { key: 'ndvi', header: 'NDVI', type: 'number' },
      { key: 'landUse', header: 'Land Use Classification', aliases: ['Land Use'], type: 'string', required: true, maxLength: 255 },
      { key: 'areaHa', header: 'Estimated Area (ha)', aliases: ['Area (ha)'], type: 'number', required: true },
      { key: 'deforestation', header: 'Deforestation Flag', type: 'string', required: true, maxLength: 50 },
      { key: 'floodRisk', header: 'Flood Risk', type: 'string', required: true, options: ['Low', 'Medium', 'High'] },
      { key: 'droughtStress', header: 'Drought Stress', type: 'string', required: true, options: ['Low', 'Medium', 'High'] },
      SOURCE_FILE,
    ],
  },
  {
    key: 'financialInclusion',
    label: 'Social — financial inclusion',
    sheet: 'Social-Fin Inclusion',
    title: '10. Social — Community Investment & Financial Inclusion',
    idMax: 20,
    idPrefix: 'FI',
    periodLocked: true,
    columns: [
      { key: 'id', header: 'Record ID', type: 'string' },
      SUBSIDIARY,
      { key: 'programme', header: 'Programme/Product', aliases: ['Programme'], type: 'string', required: true, maxLength: 255 },
      { key: 'beneficiaries', header: 'Beneficiary Count', type: 'int', required: true },
      { key: 'femaleShare', header: 'Female Beneficiaries', aliases: ['Female Beneficiaries %', 'Female Share'], type: 'percent', required: true },
      { key: 'disbursed', header: 'Total Disbursed (US$)', type: 'number', required: true },
      { key: 'geography', header: 'Geography', type: 'string', required: true, maxLength: 255 },
      { key: 'sdg', header: 'SDG Alignment', type: 'string', maxLength: 255 },
      { key: 'repaymentRate', header: 'Repayment Rate', type: 'percent', required: true },
      PERIOD,
      SOURCE_FILE,
    ],
  },
  {
    key: 'workforce',
    label: 'Social — workforce',
    sheet: 'Social-Workforce',
    title: '11. Social — Workforce Metrics',
    idMax: 20,
    idPrefix: 'WF',
    periodLocked: true,
    columns: [
      { key: 'id', header: 'Record ID', type: 'string' },
      SUBSIDIARY,
      PERIOD,
      { key: 'headcount', header: 'Total Headcount', aliases: ['Headcount'], type: 'int', required: true },
      { key: 'femaleShare', header: 'Female %', type: 'percent', required: true },
      { key: 'trainingHours', header: 'Avg Training Hrs/Employee', aliases: ['Avg Training Hours'], type: 'number', required: true },
      { key: 'ltiRate', header: 'Lost Time Injury Rate', aliases: ['LTI Rate'], type: 'number', required: true },
      { key: 'turnover', header: 'Voluntary Turnover %', type: 'percent', required: true },
      { key: 'localHire', header: 'Local Hire %', type: 'percent', required: true },
      SOURCE_FILE,
    ],
  },
  {
    key: 'incidents',
    label: 'Governance — incident register',
    sheet: 'Governance-Incidents',
    title: '13. Governance — ESG Incident Register',
    idMax: 40,
    idPrefix: 'INC',
    periodLocked: false,
    columns: [
      { key: 'id', header: 'Incident ID', type: 'string' },
      SUBSIDIARY,
      { key: 'dateReported', header: 'Date Reported', type: 'date', required: true },
      { key: 'category', header: 'Category', type: 'string', required: true, options: ['Environmental', 'Social', 'Governance', 'Compliance'] },
      { key: 'description', header: 'Description', type: 'string', required: true },
      { key: 'severity', header: 'Severity', type: 'string', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
      { key: 'status', header: 'Status', type: 'string', required: true, options: ['Open', 'In Progress', 'Closed'] },
      { key: 'correctiveAction', header: 'Corrective Action', type: 'string' },
      { key: 'closureDate', header: 'Closure Date', type: 'date' },
      SOURCE_FILE,
    ],
  },
  {
    key: 'ingestionLog',
    label: 'Ingestion audit log (history)',
    sheet: 'Ingestion Audit Log',
    title: '14. Ingestion Audit Log',
    idMax: 40,
    idPrefix: 'BATCH',
    periodLocked: false,
    columns: [
      { key: 'id', header: 'Batch ID', type: 'string' },
      { key: 'fileName', header: 'Source File Name', type: 'string', required: true, maxLength: 255 },
      {
        key: 'channel',
        header: 'Ingestion Channel',
        type: 'string',
        required: true,
        options: ['File Ingester (manual upload)', 'Satellite Data Ingester', 'Ingestion API (manual)', 'Manual form entry'],
      },
      SUBSIDIARY,
      { key: 'uploadedAt', header: 'Upload Timestamp', type: 'datetime', required: true },
      { key: 'records', header: 'Records Processed', type: 'int', required: true },
      { key: 'validationStatus', header: 'Validation Status', type: 'string', required: true, options: ['Success', 'Partial', 'Failure'] },
      { key: 'errorDetails', header: 'Error Details', type: 'string' },
      { key: 'notificationSent', header: 'Notification Sent', type: 'bool' },
    ],
  },
  {
    // Not in the sample workbook; added so the climate risk register (RFP F29/F32) can be bulk-loaded too.
    key: 'risks',
    label: 'Climate & ESG risk register',
    sheet: 'Risk Register',
    title: 'Climate & ESG Risk Register (RFP F29, F32)',
    idMax: 40,
    idPrefix: 'RSK',
    periodLocked: false,
    columns: [
      { key: 'id', header: 'Risk ID', type: 'string' },
      { key: 'title', header: 'Title', aliases: ['Risk'], type: 'string', required: true, maxLength: 255 },
      { key: 'category', header: 'Category', type: 'string', required: true, options: ['Physical', 'Transition', 'Liability', 'Opportunity'] },
      { key: 'likelihood', header: 'Likelihood (1-5)', aliases: ['Likelihood'], type: 'int', required: true },
      { key: 'impact', header: 'Impact (1-5)', aliases: ['Impact'], type: 'int', required: true },
      { key: 'owner', header: 'Owner', type: 'string', required: true, maxLength: 255 },
      { key: 'status', header: 'Status', type: 'string', required: true, options: ['Identified', 'Mitigating', 'Monitoring', 'Closed'] },
      { key: 'linkedEntity', header: 'Linked Entity', aliases: ['Subsidiary', 'Entity'], type: 'string', required: true },
    ],
  },
];

export const INFO_SHEETS: InfoSheetDef[] = [
  { sheet: 'README', reason: 'Instructions sheet: nothing to import.', signature: [] },
  { sheet: 'Lists', reason: 'Drop-down values used by the template: nothing to import.', signature: [] },
  {
    sheet: 'Entity Reference',
    reason: 'Reference sheet: subsidiaries are set up by the MAvHU team, so this sheet is only used to check codes.',
    signature: ['Entity Code', 'Subsidiary', 'Business Segment', 'Regulator'],
  },
  {
    sheet: 'DQ Portfolio Summary',
    reason: 'Calculated by the platform from Financed Emissions, so it is not imported.',
    signature: ['Asset Class', 'Number of Positions', 'Total Outstanding (US$)'],
  },
  {
    sheet: 'Facilitated Emissions',
    reason: 'PCAF Part B (facilitated emissions) is not stored by the platform yet.',
    signature: ['Transaction ID', 'Transaction Type', 'Facilitated Amount (US$)'],
  },
  {
    sheet: 'Governance-Board',
    reason: 'Board composition is not stored by the platform yet.',
    signature: ['Board Size', 'Independent Directors %', 'Female Directors %'],
  },
];
