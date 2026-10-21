import { Capability } from '../role-policy';

export type RegisterFieldType = 'string' | 'text' | 'number' | 'int' | 'score' | 'share' | 'bool' | 'date';

export interface RegisterField {
  key: string;
  label: string;
  type: RegisterFieldType;
  required?: boolean;
  options?: string[];
}

export interface RegisterDef {
  key: string;
  label: string;
  rfp: string;
  /** Whether entries can belong to one subsidiary (else always Group-level). */
  entityScoped: boolean;
  write: Capability;
  fields: RegisterField[];
}

/** Metric codes the platform computes live from bank data (targets and risk appetite read them). */
export const LIVE_METRICS = [
  'SCOPE12_TCO2E',
  'OPS_TCO2E',
  'FINANCED_TCO2E',
  'FINANCED_INTENSITY',
  'WEIGHTED_DQ',
  'FEMALE_SHARE',
  'HIGH_TRANSITION_SHARE',
  'SUSTAINABLE_SHARE',
  'OPEN_INCIDENTS',
  'MANUAL',
];

/**
 * The registers behind RFP F21, F23-F26, F31, F34-F36 and F40. Adding a field or a register is
 * configuration here (plus a seed), not a schema change.
 */
export const REGISTERS: RegisterDef[] = [
  {
    key: 'targets',
    label: 'Targets & KPIs',
    rfp: 'F21, F46',
    entityScoped: true,
    write: 'manage-registers',
    fields: [
      { key: 'name', label: 'Target', type: 'string', required: true },
      { key: 'metricCode', label: 'Measured by', type: 'string', required: true, options: LIVE_METRICS },
      { key: 'baselineYear', label: 'Baseline year', type: 'int', required: true },
      { key: 'baselineValue', label: 'Baseline value', type: 'number', required: true },
      { key: 'targetYear', label: 'Target year', type: 'int', required: true },
      { key: 'targetValue', label: 'Target value', type: 'number', required: true },
      { key: 'currentValue', label: 'Current value (manual metrics only)', type: 'number' },
      { key: 'unit', label: 'Unit', type: 'string', required: true },
      { key: 'direction', label: 'Direction', type: 'string', required: true, options: ['reduce', 'increase'] },
      { key: 'owner', label: 'Owner', type: 'string', required: true },
      { key: 'framework', label: 'Framework reference', type: 'string' },
    ],
  },
  {
    key: 'risk-appetite',
    label: 'Climate risk appetite',
    rfp: 'F31',
    entityScoped: false,
    write: 'manage-registers',
    fields: [
      { key: 'metric', label: 'Appetite metric', type: 'string', required: true },
      { key: 'metricCode', label: 'Measured by', type: 'string', required: true, options: LIVE_METRICS },
      { key: 'unit', label: 'Unit', type: 'string', required: true },
      { key: 'warning', label: 'Warning threshold', type: 'number', required: true },
      { key: 'limit', label: 'Limit', type: 'number', required: true },
      { key: 'direction', label: 'Breach when value is', type: 'string', required: true, options: ['max', 'min'] },
      { key: 'currentValue', label: 'Current value (manual metrics only)', type: 'number' },
      { key: 'owner', label: 'Owner', type: 'string', required: true },
      { key: 'escalateTo', label: 'Escalate to', type: 'string', required: true },
    ],
  },
  {
    key: 'escalations',
    label: 'Appetite escalations',
    rfp: 'F31',
    entityScoped: false,
    write: 'operational-registers',
    fields: [
      { key: 'metric', label: 'Metric', type: 'string', required: true },
      { key: 'value', label: 'Value at escalation', type: 'number', required: true },
      { key: 'limit', label: 'Limit', type: 'number', required: true },
      { key: 'raisedBy', label: 'Raised by', type: 'string', required: true },
      { key: 'raisedAt', label: 'Raised on', type: 'date', required: true },
      { key: 'status', label: 'Status', type: 'string', required: true, options: ['Open', 'Actioned', 'Closed'] },
      { key: 'note', label: 'Note', type: 'text' },
    ],
  },
  {
    key: 'material-topics',
    label: 'Materiality assessment',
    rfp: 'F24, F12',
    entityScoped: false,
    write: 'manage-registers',
    fields: [
      { key: 'topic', label: 'Topic', type: 'string', required: true },
      { key: 'pillar', label: 'Pillar', type: 'string', required: true, options: ['Environmental', 'Social', 'Governance', 'Economic'] },
      { key: 'impactScore', label: 'Impact materiality (1-5)', type: 'score', required: true },
      { key: 'financialScore', label: 'Financial materiality (1-5)', type: 'score', required: true },
      { key: 'stakeholders', label: 'Stakeholders consulted', type: 'string' },
      { key: 'frameworkRef', label: 'Framework reference', type: 'string' },
      { key: 'tnfdLeap', label: 'TNFD LEAP phase', type: 'string', options: ['', 'Locate', 'Evaluate', 'Assess', 'Prepare'] },
      { key: 'owner', label: 'Owner', type: 'string', required: true },
    ],
  },
  {
    key: 'stakeholders',
    label: 'Stakeholder register',
    rfp: 'F23',
    entityScoped: false,
    write: 'manage-registers',
    fields: [
      { key: 'name', label: 'Stakeholder', type: 'string', required: true },
      { key: 'group', label: 'Group', type: 'string', required: true, options: ['Regulator', 'Investor', 'Customer', 'Employee', 'Community', 'Supplier', 'NGO', 'Government'] },
      { key: 'influence', label: 'Influence (1-5)', type: 'score', required: true },
      { key: 'interest', label: 'Interest (1-5)', type: 'score', required: true },
      { key: 'contact', label: 'Contact', type: 'string' },
      { key: 'owner', label: 'Relationship owner', type: 'string', required: true },
    ],
  },
  {
    key: 'engagements',
    label: 'Engagement log',
    rfp: 'F23',
    entityScoped: false,
    write: 'operational-registers',
    fields: [
      { key: 'stakeholder', label: 'Stakeholder', type: 'string', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'channel', label: 'Channel', type: 'string', required: true, options: ['Meeting', 'Community forum', 'Survey', 'Email', 'Site visit', 'Report'] },
      { key: 'topics', label: 'Topics', type: 'string', required: true },
      { key: 'outcome', label: 'Outcome', type: 'text' },
      { key: 'followUp', label: 'Follow-up', type: 'string' },
      { key: 'owner', label: 'Owner', type: 'string', required: true },
    ],
  },
  {
    key: 'suppliers',
    label: 'Supplier ESG register',
    rfp: 'F26',
    entityScoped: false,
    write: 'manage-registers',
    fields: [
      { key: 'name', label: 'Supplier', type: 'string', required: true },
      { key: 'category', label: 'Category', type: 'string', required: true },
      { key: 'country', label: 'Country', type: 'string', required: true },
      { key: 'spendUsd', label: 'Annual spend (US$)', type: 'number', required: true },
      { key: 'environmentalRisk', label: 'Environmental risk (1-5)', type: 'score', required: true },
      { key: 'socialRisk', label: 'Social risk (1-5)', type: 'score', required: true },
      { key: 'governanceRisk', label: 'Governance risk (1-5)', type: 'score', required: true },
      { key: 'esgScreened', label: 'ESG screened', type: 'bool' },
      { key: 'localSupplier', label: 'Local supplier', type: 'bool' },
      { key: 'lastAssessment', label: 'Last assessment', type: 'date' },
    ],
  },
  {
    key: 'decarbonisation',
    label: 'Decarbonisation programmes',
    rfp: 'F35',
    entityScoped: true,
    write: 'operational-registers',
    fields: [
      { key: 'programme', label: 'Programme', type: 'string', required: true },
      { key: 'initiative', label: 'Initiative', type: 'string', required: true },
      { key: 'milestone', label: 'Next milestone', type: 'string', required: true },
      { key: 'dueDate', label: 'Due', type: 'date', required: true },
      { key: 'status', label: 'Status', type: 'string', required: true, options: ['Planned', 'In progress', 'At risk', 'Done'] },
      { key: 'expectedReductionTco2e', label: 'Expected reduction (tCO2e/yr)', type: 'number' },
      { key: 'owner', label: 'Owner', type: 'string', required: true },
    ],
  },
  {
    key: 'data-owners',
    label: 'Data ownership',
    rfp: 'F36',
    entityScoped: true,
    write: 'manage-registers',
    fields: [
      { key: 'dataset', label: 'Dataset', type: 'string', required: true },
      { key: 'function', label: 'Owning function', type: 'string', required: true },
      { key: 'owner', label: 'Data owner', type: 'string', required: true },
      { key: 'backupOwner', label: 'Back-up owner', type: 'string' },
      { key: 'sourceSystem', label: 'Source system', type: 'string', required: true },
      { key: 'frequency', label: 'Frequency', type: 'string', required: true, options: ['Monthly', 'Quarterly', 'Annual', 'Event-driven'] },
    ],
  },
  {
    key: 'community-investment',
    label: 'Community investment',
    rfp: 'F25',
    entityScoped: true,
    write: 'operational-registers',
    fields: [
      { key: 'programme', label: 'Programme', type: 'string', required: true },
      { key: 'location', label: 'Location', type: 'string', required: true },
      { key: 'spendUsd', label: 'Spend (US$)', type: 'number', required: true },
      { key: 'beneficiaries', label: 'Beneficiaries', type: 'int', required: true },
      { key: 'volunteerHours', label: 'Volunteer hours', type: 'int' },
      { key: 'sdg', label: 'SDG', type: 'string' },
      { key: 'period', label: 'Period', type: 'string', required: true },
    ],
  },
  {
    key: 'resource-use',
    label: 'Environmental resources',
    rfp: 'F40',
    entityScoped: true,
    write: 'operational-registers',
    fields: [
      { key: 'site', label: 'Site', type: 'string', required: true },
      { key: 'period', label: 'Period', type: 'string', required: true },
      { key: 'electricityKwh', label: 'Electricity (kWh)', type: 'number', required: true },
      { key: 'dieselLitres', label: 'Diesel (litres)', type: 'number' },
      { key: 'waterM3', label: 'Water (m³)', type: 'number', required: true },
      { key: 'wasteTonnes', label: 'Waste (tonnes)', type: 'number', required: true },
      { key: 'recycledShare', label: 'Waste recycled (0-1)', type: 'share' },
    ],
  },
  {
    key: 'esg-products',
    label: 'ESG-linked products',
    rfp: 'F34',
    entityScoped: true,
    write: 'manage-registers',
    fields: [
      { key: 'product', label: 'Product', type: 'string', required: true },
      { key: 'type', label: 'Type', type: 'string', required: true, options: ['Sustainability-linked loan', 'Green loan', 'Green retail loan', 'Green bond', 'Green deposit', 'Social loan'] },
      { key: 'counterparty', label: 'Counterparty', type: 'string', required: true },
      { key: 'amountUsd', label: 'Amount (US$)', type: 'number', required: true },
      { key: 'kpi', label: 'KPI', type: 'string', required: true },
      { key: 'kpiTarget', label: 'KPI target', type: 'number', required: true },
      { key: 'kpiActual', label: 'KPI actual', type: 'number' },
      { key: 'marginRatchetBps', label: 'Margin ratchet (bps)', type: 'int' },
      { key: 'status', label: 'Status', type: 'string', required: true, options: ['On track', 'Off track', 'Matured'] },
    ],
  },
];
