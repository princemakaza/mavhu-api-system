import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { Bank } from '../modules/banks/entities/bank.entity';
import { BankCustomer } from '../modules/bank-customers/entities/bank-customer.entity';
import { CustomerIdentifier } from '../modules/customers/entities/customer-identifier.enum';
import { Customer } from '../modules/customers/entities/customer.entity';
import { Estate } from '../modules/estates/entities/estate.entity';
import { RolesService } from '../modules/roles/roles.service';
import { UserRolesService } from '../modules/user-roles/user-roles.service';
import { UsersService } from '../modules/users/users.service';
import { CbzEntity } from '../modules/cbz/entities/cbz-entity.entity';
import { CbzDepartment } from '../modules/cbz/entities/cbz-department.entity';
import { CbzMember } from '../modules/cbz/entities/cbz-member.entity';
import { CbzCounterparty } from '../modules/cbz/entities/cbz-counterparty.entity';
import { CbzFinancedPosition } from '../modules/cbz/entities/cbz-financed-position.entity';
import { CbzEsgEmission } from '../modules/cbz/entities/cbz-esg-emission.entity';
import { CbzInsurancePolicy } from '../modules/cbz/entities/cbz-insurance-policy.entity';
import { CbzFinancialInclusion } from '../modules/cbz/entities/cbz-financial-inclusion.entity';
import { CbzWorkforce } from '../modules/cbz/entities/cbz-workforce.entity';
import { CbzIncident } from '../modules/cbz/entities/cbz-incident.entity';
import { CbzRiskEntry } from '../modules/cbz/entities/cbz-risk-entry.entity';
import { CbzGeospatial } from '../modules/cbz/entities/cbz-geospatial.entity';
import { CbzIngestionBatch } from '../modules/cbz/entities/cbz-ingestion-batch.entity';
import { CbzAuditLog } from '../modules/cbz/entities/cbz-audit-log.entity';

const PASSWORD = process.env.SEED_PASSWORD ?? 'Mavhu@2026!';

const CUSTOMERS = [
  { key: 'mavhu', name: 'Mavhu Africa', hectares: 1, email: 'info@mavhu.africa', identifier: CustomerIdentifier.PLATFORM },
  { key: 'cbz', name: 'CBZ Bank Limited', hectares: 1, email: 'esg@cbz.co.zw', identifier: CustomerIdentifier.BANK },
  { key: 'stanbic', name: 'Stanbic Bank Zimbabwe', hectares: 1, email: 'esg@stanbicbank.co.zw', identifier: CustomerIdentifier.BANK },
  { key: 'fbc', name: 'FBC Bank Limited', hectares: 1, email: 'esg@fbc.co.zw', identifier: CustomerIdentifier.BANK },
  { key: 'chipinge', name: 'Chipinge Tea Estates (Pvt) Ltd', hectares: 850, email: 'info@chipingetea.co.zw', identifier: CustomerIdentifier.AGROBUSINESS },
  { key: 'marondera', name: 'Marondera Maize Holdings', hectares: 1200, email: 'office@maronderamaize.co.zw', identifier: CustomerIdentifier.AGROBUSINESS },
  { key: 'chiredzi', name: 'Chiredzi Sugar Growers', hectares: 2100, email: 'admin@chiredzisugar.co.zw', identifier: CustomerIdentifier.AGROBUSINESS },
  { key: 'nyanga', name: 'Nyanga Highlands Orchards', hectares: 640, email: 'hello@nyangaorchards.co.zw', identifier: CustomerIdentifier.AGROBUSINESS },
];

const BANKS = [
  { key: 'cbz', name: 'CBZ Bank Limited', email: 'contact@cbz.co.zw', identifier: 'CBZ-ZW-001' },
  { key: 'stanbic', name: 'Stanbic Bank Zimbabwe', email: 'contact@stanbicbank.co.zw', identifier: 'STANBIC-ZW-001' },
  { key: 'fbc', name: 'FBC Bank Limited', email: 'contact@fbc.co.zw', identifier: 'FBC-ZW-001' },
];

// [bank, agribusiness customer, reference number]
const BANK_CLIENTS: [string, string, string][] = [
  ['cbz', 'chipinge', 'CBZ-AGR-0001'],
  ['cbz', 'marondera', 'CBZ-AGR-0002'],
  ['cbz', 'chiredzi', 'CBZ-AGR-0003'],
  ['stanbic', 'nyanga', 'STB-AGR-0001'],
  ['fbc', 'marondera', 'FBC-AGR-0001'],
];

const ESTATES = [
  { customer: 'chipinge', name: 'Chipinge Highveld Block', hectares: 850, email: 'estate@chipingetea.co.zw' },
  { customer: 'marondera', name: 'Marondera North Fields', hectares: 1200, email: 'estate@maronderamaize.co.zw' },
  { customer: 'chiredzi', name: 'Hippo Valley Cane Fields', hectares: 2100, email: 'estate@chiredzisugar.co.zw' },
  { customer: 'nyanga', name: 'Nyanga Orchard Terraces', hectares: 640, email: 'estate@nyangaorchards.co.zw' },
];

const USERS: { name: string; email: string; customer: string; role: string }[] = [
  // Mavhu Africa platform administrators
  { name: 'Tendai Moyo', email: 'tendai.moyo@mavhu.africa', customer: 'mavhu', role: 'MAVHU_ADMIN' },
  { name: 'Rudo Chikwanha', email: 'rudo.chikwanha@mavhu.africa', customer: 'mavhu', role: 'MAVHU_ADMIN' },
  { name: 'Farai Ncube', email: 'farai.ncube@mavhu.africa', customer: 'mavhu', role: 'MAVHU_ADMIN' },
  // CBZ (bank client)
  { name: 'Tafadzwa Sibanda', email: 'tafadzwa.sibanda@cbz.co.zw', customer: 'cbz', role: 'AUDITOR' },
  { name: 'Nyasha Dube', email: 'nyasha.dube@cbz.co.zw', customer: 'cbz', role: 'ESG_APPROVER' },
  { name: 'Chipo Mutasa', email: 'chipo.mutasa@cbz.co.zw', customer: 'cbz', role: 'ESG_READER' },
  // Agribusiness clients
  { name: 'Blessing Mhlanga', email: 'blessing.mhlanga@chipingetea.co.zw', customer: 'chipinge', role: 'ESG_CONTRIBUTOR' },
  { name: 'Tinashe Gumbo', email: 'tinashe.gumbo@maronderamaize.co.zw', customer: 'marondera', role: 'ESG_CONTRIBUTOR' },
  { name: 'Kudzai Zhou', email: 'kudzai.zhou@maronderamaize.co.zw', customer: 'marondera', role: 'ESG_APPROVER' },
  { name: 'Rutendo Makoni', email: 'rutendo.makoni@chiredzisugar.co.zw', customer: 'chiredzi', role: 'ESG_READER' },
];

async function findOrCreate<T extends ObjectLiteral>(
  ds: DataSource,
  entity: EntityTarget<T>,
  where: Partial<T>,
  data: Partial<T>,
): Promise<T> {
  const repo = ds.getRepository(entity);
  const existing = await repo.findOne({ where: where as never });
  if (existing) return existing;
  return (await repo.save(repo.create({ ...where, ...data } as never))) as unknown as T;
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const ds = app.get(DataSource);
  const users = app.get(UsersService);
  const roles = app.get(RolesService);
  const userRoles = app.get(UserRolesService);

  const customers: Record<string, Customer> = {};
  for (const { key, ...c } of CUSTOMERS) {
    customers[key] = await findOrCreate(ds, Customer, { email: c.email }, { ...c, country: 'Zimbabwe' });
  }

  const banks: Record<string, Bank> = {};
  for (const { key, ...b } of BANKS) {
    banks[key] = await findOrCreate(ds, Bank, { email: b.email }, { ...b, country: 'Zimbabwe' });
  }

  for (const [bank, customer, ref] of BANK_CLIENTS) {
    await findOrCreate(
      ds,
      BankCustomer,
      { bankId: banks[bank].id, customerId: customers[customer].id },
      { customerReferenceNumber: ref },
    );
  }

  for (const e of ESTATES) {
    await findOrCreate(ds, Estate, { email: e.email }, {
      name: e.name,
      hectares: e.hectares,
      customerId: customers[e.customer].id,
      country: 'Zimbabwe',
    });
  }

  for (const u of USERS) {
    let user = await users.findByEmail(u.email);
    if (!user) {
      user = await users.create({ name: u.name, email: u.email, password: PASSWORD, customerId: customers[u.customer].id });
      const role = await roles.findByName(u.role);
      await userRoles.create({ userId: user.id, roleId: role.id, auditTrail: 'Provisioned by seed script' });
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Seed complete. ${USERS.length} users available; shared dev password: ${PASSWORD}`);

  await seedCbz(ds);
  await app.close();
}

async function seedCbz(ds: DataSource) {
  const CBZ_PASSWORD = 'cbz-demo';
  const hash = await bcrypt.hash(CBZ_PASSWORD, 10);

  // ── Entities ──────────────────────────────────────────────────────────────
  const entityRepo = ds.getRepository(CbzEntity);
  const CBZ_ENTITIES = [
    { code: 'CBZBANK', name: 'CBZ Bank', segment: 'Commercial & corporate banking', regulator: 'RBZ', pcafApplicable: 'A (lending), B (if underwriting)', notes: 'Largest loan book; business loans, mortgages, motor vehicle, CRE' },
    { code: 'CBZCAP', name: 'CBZ Capital', segment: 'Investment banking / capital markets', regulator: 'RBZ/SECZim', pcafApplicable: 'A (project finance), B (facilitated)', notes: 'Facilitated-emissions scope pending mandate confirmation' },
    { code: 'DATVEST', name: 'Datvest (CBZ Asset Management)', segment: 'Asset management', regulator: 'SECZim', pcafApplicable: 'A (listed equity, corp bonds, sovereign, sub-sovereign)', notes: 'Holds fixed income incl. Treasury Bills' },
    { code: 'CBZAGRO', name: 'CBZ Agro-Yield', segment: 'Agribusiness financing', regulator: 'RBZ', pcafApplicable: 'A (business loans), operational', notes: 'Primary target for MAvHU satellite/geospatial MRV uplift' },
    { code: 'CBZPROP', name: 'CBZ Properties', segment: 'Property investment', regulator: 'n/a', pcafApplicable: 'A (CRE)', notes: '' },
    { code: 'CBZINS', name: 'CBZ Insurance', segment: 'Short-term/general insurance', regulator: 'IPEC', pcafApplicable: 'C (insurance-associated)', notes: 'Commercial lines, personal motor, project insurance, treaty reinsurance' },
    { code: 'CBZLIFE', name: 'CBZ Life', segment: 'Life assurance', regulator: 'IPEC', pcafApplicable: 'None — operational only', notes: 'Excluded from Part C; life/health/pensions not yet covered by any PCAF standard' },
    { code: 'CBZRISK', name: 'CBZ Risk Advisory', segment: 'Insurance broking / risk advisory', regulator: 'IPEC', pcafApplicable: 'None — operational only', notes: 'No PCAF asset class applies to pure advisory activity' },
    { code: 'CBZRED', name: 'CBZ Red Sphere Finance', segment: 'Microfinance', regulator: 'RBZ', pcafApplicable: 'A (business loans, small scale)', notes: 'Financial-inclusion reporting priority' },
  ];
  for (const e of CBZ_ENTITIES) {
    const existing = await entityRepo.findOne({ where: { code: e.code } });
    if (!existing) await entityRepo.save(entityRepo.create(e));
  }

  // ── Departments ───────────────────────────────────────────────────────────
  const deptRepo = ds.getRepository(CbzDepartment);
  const CBZ_DEPTS = [
    { id: 'DEPT-001', entityCode: 'CBZBANK', name: 'Corporate & Commercial Banking', kind: 'Commercial Banking', headOfDept: 'Tafara Chikwanha', email: 'corporate@cbz.co.zw' },
    { id: 'DEPT-002', entityCode: 'CBZBANK', name: 'Retail & Mortgages', kind: 'Commercial Banking', headOfDept: 'Nyasha Moyo', email: 'mortgages@cbz.co.zw' },
    { id: 'DEPT-003', entityCode: 'CBZINS', name: 'Commercial Lines Underwriting', kind: 'Short-term Insurance', headOfDept: 'Rutendo Mukamuri', email: 'commercial-underwriting@cbzinsurance.co.zw' },
    { id: 'DEPT-004', entityCode: 'CBZINS', name: 'Personal & Motor Insurance', kind: 'Short-term Insurance', headOfDept: 'Farai Ndlovu', email: 'motor@cbzinsurance.co.zw' },
    { id: 'DEPT-005', entityCode: 'CBZAGRO', name: 'Contract Farming Operations', kind: 'Agribusiness', headOfDept: 'Simba Chirwa', email: 'contracts@agroyield.co.zw' },
    { id: 'DEPT-006', entityCode: 'CBZAGRO', name: 'Smallholder & Financial Inclusion', kind: 'Microfinance', headOfDept: 'Chiedza Mangwiro', email: 'inclusion@agroyield.co.zw' },
    { id: 'DEPT-007', entityCode: 'DATVEST', name: 'Fixed Income Portfolio', kind: 'Asset Management', headOfDept: 'Kudakwashe Sithole', email: 'fixed-income@datvest.co.zw' },
    { id: 'DEPT-008', entityCode: 'CBZCAP', name: 'Project & Structured Finance', kind: 'Investment Banking', headOfDept: 'Blessing Mutasa', email: 'projects@cbzcapital.co.zw' },
    { id: 'DEPT-009', entityCode: 'CBZPROP', name: 'Portfolio Operations', kind: 'Property', headOfDept: 'Tendai Chikomo', email: 'ops@cbzproperties.co.zw' },
    { id: 'DEPT-010', entityCode: 'CBZRED', name: 'Rural Micro-lending', kind: 'Microfinance', headOfDept: 'Panashe Zvavamwe', email: 'rural@redsphere.co.zw' },
  ];
  for (const d of CBZ_DEPTS) {
    const existing = await deptRepo.findOne({ where: { id: d.id } });
    if (!existing) await deptRepo.save(deptRepo.create(d));
  }

  // ── Members ───────────────────────────────────────────────────────────────
  const memberRepo = ds.getRepository(CbzMember);
  const CBZ_MEMBERS = [
    { id: 'USR-ADMIN', fullName: 'Anesu Mutasa', email: 'anesu.mutasa@cbzholdings.co.zw', phone: '+263 77 900 0100', entityCode: 'CBZBANK', departmentId: null, role: 'admin' },
    { id: 'USR-APPROVER-BANK', fullName: 'Tafara Chikwanha', email: 'tafara.chikwanha@cbz.co.zw', phone: '+263 77 900 0101', entityCode: 'CBZBANK', departmentId: 'DEPT-001', role: 'approver' },
    { id: 'USR-CONTRIB-BANK', fullName: 'Melissa Chirandu', email: 'melissa.chirandu@cbz.co.zw', phone: '+263 77 900 0102', entityCode: 'CBZBANK', departmentId: 'DEPT-002', role: 'contributor' },
    { id: 'USR-CONTRIB-INS', fullName: 'Rutendo Mukamuri', email: 'rutendo.mukamuri@cbzinsurance.co.zw', phone: '+263 77 900 0103', entityCode: 'CBZINS', departmentId: 'DEPT-003', role: 'contributor' },
    { id: 'USR-CONTRIB-AGRO', fullName: 'Simba Chirwa', email: 'simba.chirwa@agroyield.co.zw', phone: '+263 77 900 0104', entityCode: 'CBZAGRO', departmentId: 'DEPT-005', role: 'contributor' },
    { id: 'USR-READER-DATVEST', fullName: 'Kudakwashe Sithole', email: 'kudakwashe.sithole@datvest.co.zw', phone: '+263 77 900 0105', entityCode: 'DATVEST', departmentId: 'DEPT-007', role: 'reader' },
    { id: 'USR-CUST-MILLERS', fullName: 'Mashonaland Grain Millers Ops', email: 'sustainability@grainmillers.co.zw', phone: '+263 77 900 0201', entityCode: 'CBZBANK', departmentId: 'DEPT-001', role: 'customer' },
    { id: 'USR-CUST-HIGHVELD', fullName: 'Highveld Beverages ESG Lead', email: 'esg@highveldbev.co.zw', phone: '+263 77 900 0202', entityCode: 'CBZBANK', departmentId: 'DEPT-001', role: 'customer' },
  ];
  for (const m of CBZ_MEMBERS) {
    const existing = await memberRepo.findOne({ where: { id: m.id } });
    if (!existing) await memberRepo.save(memberRepo.create({ ...m, passwordHash: hash }));
  }

  // ── Counterparties ────────────────────────────────────────────────────────
  const cpRepo = ds.getRepository(CbzCounterparty);
  const CBZ_CPS = [
    { id: 'CP-001', name: 'Mashonaland Grain Millers (Pvt) Ltd', sector: 'Agri-processing', listedStatus: 'Unlisted', assetClass: 'business_loans_unlisted_equity', subsidiary: 'CBZBANK', financials: { totalEquityDebt: 4800000, totalRevenue: 6800000 }, totalEmissionsTco2e: 2850, dqScore: 3, mrvEnhanced: true },
    { id: 'CP-002', name: 'Manyame Textiles Ltd', sector: 'Manufacturing', listedStatus: 'Unlisted', assetClass: 'business_loans_unlisted_equity', subsidiary: 'CBZAGRO', financials: { totalEquityDebt: 2100000, totalRevenue: 3100000 }, totalEmissionsTco2e: 1920, dqScore: 4, mrvEnhanced: false },
    { id: 'CP-003', name: 'Highveld Beverages PLC', sector: 'Consumer goods', listedStatus: 'Listed', assetClass: 'business_loans_listed', subsidiary: 'CBZBANK', financials: { evic: 145000000, totalRevenue: 210000000 }, totalEmissionsTco2e: 41200, dqScore: 4, mrvEnhanced: false },
    { id: 'CP-004', name: 'Nyanga Hydro Partners (Pvt) Ltd', sector: 'Renewable energy', listedStatus: 'Unlisted', assetClass: 'project_finance', subsidiary: 'CBZCAP', financials: { projectTotalCost: 18500000 }, totalEmissionsTco2e: 1150, dqScore: 2, mrvEnhanced: true },
    { id: 'CP-005', name: 'Chinhoyi Solar Partners (Pvt) Ltd', sector: 'Renewable energy', listedStatus: 'Unlisted', assetClass: 'project_finance', subsidiary: 'CBZCAP', financials: { projectTotalCost: 9700000 }, totalEmissionsTco2e: 480, dqScore: 2, mrvEnhanced: true },
    { id: 'CP-006', name: 'Borrowdale Office Park (Pvt) Ltd', sector: 'Real estate', listedStatus: 'Unlisted', assetClass: 'commercial_real_estate', subsidiary: 'CBZPROP', financials: { propertyValue: 12800000 }, totalEmissionsTco2e: 980, dqScore: 4, mrvEnhanced: false },
    { id: 'CP-007', name: 'Msasa Industrial Park (Pvt) Ltd', sector: 'Real estate', listedStatus: 'Unlisted', assetClass: 'commercial_real_estate', subsidiary: 'CBZBANK', financials: { propertyValue: 7900000 }, totalEmissionsTco2e: 1340, dqScore: 4, mrvEnhanced: false },
    { id: 'CP-008', name: 'Retail Mortgage Customer #00214', sector: 'Residential', listedStatus: 'n/a', assetClass: 'mortgages', subsidiary: 'CBZBANK', financials: { propertyValue: 260000 }, totalEmissionsTco2e: 6.4, dqScore: 4, mrvEnhanced: false },
    { id: 'CP-009', name: 'Retail Mortgage Customer #00389', sector: 'Residential', listedStatus: 'n/a', assetClass: 'mortgages', subsidiary: 'CBZBANK', financials: { propertyValue: 140000 }, totalEmissionsTco2e: 4.1, dqScore: 4, mrvEnhanced: false },
    { id: 'CP-010', name: 'Retail Vehicle Loan #01023', sector: 'Personal transport', listedStatus: 'n/a', assetClass: 'motor_vehicle_loans', subsidiary: 'CBZBANK', financials: { vehicleValue: 24000 }, totalEmissionsTco2e: 3.2, dqScore: 3, mrvEnhanced: false },
    { id: 'CP-011', name: 'Retail Vehicle Loan #01187', sector: 'Personal transport', listedStatus: 'n/a', assetClass: 'motor_vehicle_loans', subsidiary: 'CBZBANK', financials: { vehicleValue: 31500 }, totalEmissionsTco2e: 4.6, dqScore: 3, mrvEnhanced: false },
    { id: 'CP-012', name: 'Eastlands Mining Corp PLC', sector: 'Mining', listedStatus: 'Listed', assetClass: 'listed_equity_corporate_bonds', subsidiary: 'DATVEST', financials: { evic: 68000000 }, totalEmissionsTco2e: 96500, dqScore: 5, mrvEnhanced: false },
    { id: 'CP-013', name: 'Government of Zimbabwe 91-day Treasury Bill', sector: 'Sovereign', listedStatus: 'Sovereign', assetClass: 'sovereign_debt', subsidiary: 'DATVEST', financials: { gdpPpp: 44000000000 }, totalEmissionsTco2e: 28400000, dqScore: 5, mrvEnhanced: false },
    { id: 'CP-014', name: 'Government of Zimbabwe ZWG Bond 2029', sector: 'Sovereign', listedStatus: 'Sovereign', assetClass: 'sovereign_debt', subsidiary: 'DATVEST', financials: { gdpPpp: 44000000000 }, totalEmissionsTco2e: 28400000, dqScore: 5, mrvEnhanced: false },
    { id: 'CP-015', name: 'City of Harare Municipal Bond 2027', sector: 'Sub-sovereign', listedStatus: 'Sub-sovereign', assetClass: 'sub_sovereign_debt', subsidiary: 'DATVEST', financials: { regionalGdpPpp: 3200000000 }, totalEmissionsTco2e: 185000, dqScore: 5, mrvEnhanced: false },
    { id: 'CP-016', name: 'Bulawayo City Council Water Infrastructure Note', sector: 'Sub-sovereign', listedStatus: 'Sub-sovereign', assetClass: 'sub_sovereign_debt', subsidiary: 'DATVEST', financials: { regionalGdpPpp: 1450000000 }, totalEmissionsTco2e: 92000, dqScore: 5, mrvEnhanced: false },
    { id: 'CP-017', name: 'CBZ Green Infrastructure Bond 2026', sector: 'Green bond', listedStatus: 'Unlisted', assetClass: 'use_of_proceeds', subsidiary: 'CBZBANK', financials: { uopStructureValue: 3000000 }, totalEmissionsTco2e: 640, dqScore: 3, mrvEnhanced: true },
    { id: 'CP-018', name: 'Agro-Yield Solar Mini-Grid Loan', sector: 'Renewable energy', listedStatus: 'Unlisted', assetClass: 'use_of_proceeds', subsidiary: 'CBZAGRO', financials: { uopStructureValue: 480000 }, totalEmissionsTco2e: 95, dqScore: 2, mrvEnhanced: true },
  ];
  for (const cp of CBZ_CPS) {
    const existing = await cpRepo.findOne({ where: { id: cp.id } });
    if (!existing) await cpRepo.save(cpRepo.create(cp));
  }

  // ── Financed positions ────────────────────────────────────────────────────
  const fpRepo = ds.getRepository(CbzFinancedPosition);
  const CBZ_FPS = [
    { id: 'FE-001', counterpartyId: 'CP-001', outstandingAmountUsd: 1250000, period: '2026-Q3' },
    { id: 'FE-002', counterpartyId: 'CP-002', outstandingAmountUsd: 640000, period: '2026-Q3' },
    { id: 'FE-003', counterpartyId: 'CP-003', outstandingAmountUsd: 3800000, period: '2026-Q3' },
    { id: 'FE-004', counterpartyId: 'CP-004', outstandingAmountUsd: 5200000, period: '2026-Q3' },
    { id: 'FE-005', counterpartyId: 'CP-005', outstandingAmountUsd: 2900000, period: '2026-Q3' },
    { id: 'FE-006', counterpartyId: 'CP-006', outstandingAmountUsd: 4100000, period: '2026-Q3' },
    { id: 'FE-007', counterpartyId: 'CP-007', outstandingAmountUsd: 2650000, period: '2026-Q3' },
    { id: 'FE-008', counterpartyId: 'CP-008', outstandingAmountUsd: 185000, period: '2026-Q3' },
    { id: 'FE-009', counterpartyId: 'CP-009', outstandingAmountUsd: 92000, period: '2026-Q3' },
    { id: 'FE-010', counterpartyId: 'CP-010', outstandingAmountUsd: 18500, period: '2026-Q3' },
    { id: 'FE-011', counterpartyId: 'CP-011', outstandingAmountUsd: 26200, period: '2026-Q3' },
    { id: 'FE-012', counterpartyId: 'CP-003', outstandingAmountUsd: 950000, period: '2026-Q3' },
    { id: 'FE-013', counterpartyId: 'CP-012', outstandingAmountUsd: 1400000, period: '2026-Q3' },
    { id: 'FE-014', counterpartyId: 'CP-013', outstandingAmountUsd: 2200000, period: '2026-Q3' },
    { id: 'FE-015', counterpartyId: 'CP-014', outstandingAmountUsd: 1600000, period: '2026-Q3' },
    { id: 'FE-016', counterpartyId: 'CP-017', outstandingAmountUsd: 3000000, period: '2026-Q3' },
    { id: 'FE-017', counterpartyId: 'CP-018', outstandingAmountUsd: 480000, period: '2026-Q3' },
    { id: 'FE-018', counterpartyId: 'CP-015', outstandingAmountUsd: 410000, period: '2026-Q3' },
    { id: 'FE-019', counterpartyId: 'CP-016', outstandingAmountUsd: 260000, period: '2026-Q3' },
  ];
  for (const fp of CBZ_FPS) {
    const existing = await fpRepo.findOne({ where: { id: fp.id } });
    if (!existing) await fpRepo.save(fpRepo.create(fp));
  }

  // ── ESG Emissions ─────────────────────────────────────────────────────────
  const emRepo = ds.getRepository(CbzEsgEmission);
  const CBZ_EMISSIONS = [
    { id: 'S1-001', entityCode: 'CBZBANK', site: 'Harare Head Office', period: '2026-08', scope: 'scope1', datasetType: 'Fleet fuel', fuelType: 'Diesel', activityData: 2450, unit: 'litres', emissionFactorKgPerUnit: 2.68, emissionsKgCo2e: 6566, emissionsTco2e: 6.566, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZBANK_SCOPE1_FLEETFUEL_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-BANK', submittedAt: new Date('2026-09-02T08:14:00Z'), approvedBy: 'USR-APPROVER-BANK', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S1-002', entityCode: 'CBZBANK', site: 'Bulawayo Branch', period: '2026-08', scope: 'scope1', datasetType: 'Fleet fuel', fuelType: 'Petrol', activityData: 980, unit: 'litres', emissionFactorKgPerUnit: 2.31, emissionsKgCo2e: 2263.8, emissionsTco2e: 2.2638, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZBANK_SCOPE1_FLEETFUEL_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-BANK', submittedAt: new Date('2026-09-02T08:14:00Z'), approvedBy: 'USR-APPROVER-BANK', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S1-003', entityCode: 'CBZAGRO', site: 'Mvurwi Regional Office', period: '2026-08', scope: 'scope1', datasetType: 'Fleet fuel', fuelType: 'Diesel', activityData: 3120, unit: 'litres', emissionFactorKgPerUnit: 2.68, emissionsKgCo2e: 8361.6, emissionsTco2e: 8.3616, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZAGRO_SCOPE1_FLEETFUEL_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-AGRO', submittedAt: new Date('2026-09-02T08:14:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-04T10:00:00Z') },
    { id: 'S1-004', entityCode: 'CBZBANK', site: 'Harare Head Office', period: '2026-08', scope: 'scope1', datasetType: 'Backup generator', fuelType: 'Diesel', activityData: 1840, unit: 'litres', emissionFactorKgPerUnit: 2.68, emissionsKgCo2e: 4931.2, emissionsTco2e: 4.9312, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZBANK_SCOPE1_GENSET_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-BANK', submittedAt: new Date('2026-09-02T09:00:00Z'), approvedBy: 'USR-APPROVER-BANK', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S1-005', entityCode: 'CBZINS', site: 'Harare Underwriting Centre', period: '2026-08', scope: 'scope1', datasetType: 'Backup generator', fuelType: 'Diesel', activityData: 610, unit: 'litres', emissionFactorKgPerUnit: 2.68, emissionsKgCo2e: 1634.8, emissionsTco2e: 1.6348, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZINS_SCOPE1_GENSET_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-INS', submittedAt: new Date('2026-09-02T09:41:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-04T10:00:00Z') },
    { id: 'S1-006', entityCode: 'CBZPROP', site: 'Borrowdale Office Park', period: '2026-08', scope: 'scope1', datasetType: 'Backup generator', fuelType: 'Diesel', activityData: 940, unit: 'litres', emissionFactorKgPerUnit: 2.68, emissionsKgCo2e: 2519.2, emissionsTco2e: 2.5192, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZPROP_SCOPE1_GENSET_2026-08_v1.csv', submittedBy: 'USR-ADMIN', submittedAt: new Date('2026-09-02T09:15:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S1-007', entityCode: 'CBZBANK', site: 'Harare Head Office', period: '2026-08', scope: 'scope1', datasetType: 'Refrigerant top-up', fuelType: 'R410A', activityData: 4.5, unit: 'kg', emissionFactorKgPerUnit: 2088, emissionsKgCo2e: 9396, emissionsTco2e: 9.396, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZBANK_SCOPE1_REFRIG_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-BANK', submittedAt: new Date('2026-09-02T09:30:00Z'), approvedBy: 'USR-APPROVER-BANK', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S1-008', entityCode: 'DATVEST', site: 'Harare Office', period: '2026-08', scope: 'scope1', datasetType: 'Refrigerant top-up', fuelType: 'R134a', activityData: 1.8, unit: 'kg', emissionFactorKgPerUnit: 1430, emissionsKgCo2e: 2574, emissionsTco2e: 2.574, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'DATVEST_SCOPE1_REFRIG_2026-08_v1.csv', submittedBy: 'USR-READER-DATVEST', submittedAt: new Date('2026-09-02T10:00:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S1-009', entityCode: 'CBZBANK', site: 'Mutare Branch', period: '2026-08', scope: 'scope1', datasetType: 'Fleet fuel', fuelType: 'Diesel', activityData: 1120, unit: 'litres', emissionFactorKgPerUnit: 2.68, emissionsKgCo2e: 3001.6, emissionsTco2e: 3.0016, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZBANK_SCOPE1_FLEETFUEL_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-BANK', submittedAt: new Date('2026-09-02T08:14:00Z'), approvedBy: 'USR-APPROVER-BANK', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S1-010', entityCode: 'CBZRED', site: 'Masvingo Agent Hub', period: '2026-08', scope: 'scope1', datasetType: 'Fleet fuel', fuelType: 'Petrol', activityData: 560, unit: 'litres', emissionFactorKgPerUnit: 2.31, emissionsKgCo2e: 1293.6, emissionsTco2e: 1.2936, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZRED_SCOPE1_FLEETFUEL_2026-08_v1.csv', submittedBy: 'USR-ADMIN', submittedAt: new Date('2026-09-02T08:14:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S2-001', entityCode: 'CBZBANK', site: 'Harare Head Office', period: '2026-08', scope: 'scope2', datasetType: 'Grid electricity (location-based)', fuelType: null, activityData: 84500, unit: 'kWh', emissionFactorKgPerUnit: 0.65, emissionsKgCo2e: 54925, emissionsTco2e: 54.925, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZBANK_SCOPE2_ELEC_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-BANK', submittedAt: new Date('2026-09-02T11:00:00Z'), approvedBy: 'USR-APPROVER-BANK', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S2-002', entityCode: 'CBZBANK', site: 'Bulawayo Branch', period: '2026-08', scope: 'scope2', datasetType: 'Grid electricity (location-based)', fuelType: null, activityData: 31200, unit: 'kWh', emissionFactorKgPerUnit: 0.65, emissionsKgCo2e: 20280, emissionsTco2e: 20.28, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZBANK_SCOPE2_ELEC_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-BANK', submittedAt: new Date('2026-09-02T11:00:00Z'), approvedBy: 'USR-APPROVER-BANK', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S2-003', entityCode: 'CBZAGRO', site: 'Mvurwi Regional Office', period: '2026-08', scope: 'scope2', datasetType: 'Grid electricity (location-based)', fuelType: null, activityData: 12800, unit: 'kWh', emissionFactorKgPerUnit: 0.65, emissionsKgCo2e: 8320, emissionsTco2e: 8.32, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZAGRO_SCOPE2_ELEC_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-AGRO', submittedAt: new Date('2026-09-02T11:00:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S2-004', entityCode: 'CBZINS', site: 'Harare Underwriting Centre', period: '2026-08', scope: 'scope2', datasetType: 'Grid electricity (location-based)', fuelType: null, activityData: 19600, unit: 'kWh', emissionFactorKgPerUnit: 0.65, emissionsKgCo2e: 12740, emissionsTco2e: 12.74, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZINS_SCOPE2_ELEC_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-INS', submittedAt: new Date('2026-09-02T11:00:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S2-005', entityCode: 'CBZPROP', site: 'Borrowdale Office Park', period: '2026-08', scope: 'scope2', datasetType: 'Grid electricity (location-based)', fuelType: null, activityData: 28400, unit: 'kWh', emissionFactorKgPerUnit: 0.65, emissionsKgCo2e: 18460, emissionsTco2e: 18.46, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZPROP_SCOPE2_ELEC_2026-08_v1.csv', submittedBy: 'USR-ADMIN', submittedAt: new Date('2026-09-02T11:00:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S2-006', entityCode: 'DATVEST', site: 'Harare Office', period: '2026-08', scope: 'scope2', datasetType: 'Grid electricity (location-based)', fuelType: null, activityData: 9100, unit: 'kWh', emissionFactorKgPerUnit: 0.65, emissionsKgCo2e: 5915, emissionsTco2e: 5.915, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'DATVEST_SCOPE2_ELEC_2026-08_v1.csv', submittedBy: 'USR-READER-DATVEST', submittedAt: new Date('2026-09-02T11:00:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S2-007', entityCode: 'CBZRED', site: 'Masvingo Agent Hub', period: '2026-08', scope: 'scope2', datasetType: 'Grid electricity (location-based)', fuelType: null, activityData: 4200, unit: 'kWh', emissionFactorKgPerUnit: 0.65, emissionsKgCo2e: 2730, emissionsTco2e: 2.73, method: 'activity-based', dataQuality: 2, status: 'approved', sourceRef: 'CBZRED_SCOPE2_ELEC_2026-08_v1.csv', submittedBy: 'USR-ADMIN', submittedAt: new Date('2026-09-02T11:00:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-03T10:00:00Z') },
    { id: 'S3-001', entityCode: 'CBZBANK', site: 'Group', period: '2026-Q3', scope: 'scope3', datasetType: 'Cat 1 - Procurement', fuelType: null, activityData: 185000, unit: 'US$', emissionFactorKgPerUnit: 0.35, emissionsKgCo2e: 64750, emissionsTco2e: 64.75, method: 'spend-based', dataQuality: 4, status: 'approved', sourceRef: 'CBZBANK_SCOPE3CAT1_PROCURE_2026-Q3_v1.csv', submittedBy: 'USR-CONTRIB-BANK', submittedAt: new Date('2026-09-05T09:00:00Z'), approvedBy: 'USR-APPROVER-BANK', approvedAt: new Date('2026-09-06T10:00:00Z') },
    { id: 'S3-002', entityCode: 'CBZAGRO', site: 'Group', period: '2026-Q3', scope: 'scope3', datasetType: 'Cat 1 - Agri-inputs', fuelType: null, activityData: 96000, unit: 'US$', emissionFactorKgPerUnit: 0.55, emissionsKgCo2e: 52800, emissionsTco2e: 52.8, method: 'spend-based', dataQuality: 4, status: 'approved', sourceRef: 'CBZAGRO_SCOPE3CAT1_PROCURE_2026-Q3_v1.csv', submittedBy: 'USR-CONTRIB-AGRO', submittedAt: new Date('2026-09-05T09:00:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-06T10:00:00Z') },
    { id: 'S3-003', entityCode: 'CBZPROP', site: 'Borrowdale annex', period: '2026-Q3', scope: 'scope3', datasetType: 'Cat 2 - Capex', fuelType: null, activityData: 420000, unit: 'US$', emissionFactorKgPerUnit: 0.4, emissionsKgCo2e: 168000, emissionsTco2e: 168, method: 'spend-based', dataQuality: 4, status: 'approved', sourceRef: 'CBZPROP_SCOPE3CAT2_CAPEX_2026-Q3_v1.csv', submittedBy: 'USR-ADMIN', submittedAt: new Date('2026-09-05T09:00:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-06T10:00:00Z') },
    { id: 'S3-004', entityCode: 'CBZBANK', site: 'Group', period: '2026-08', scope: 'scope3', datasetType: 'Cat 3 - T&D losses', fuelType: null, activityData: 84500, unit: 'kWh', emissionFactorKgPerUnit: 0.045, emissionsKgCo2e: 3802.5, emissionsTco2e: 3.8025, method: 'activity-based', dataQuality: 3, status: 'approved', sourceRef: 'CBZBANK_SCOPE3CAT3_TDLOSS_2026-08_v1.csv', submittedBy: 'USR-CONTRIB-BANK', submittedAt: new Date('2026-09-05T09:00:00Z'), approvedBy: 'USR-APPROVER-BANK', approvedAt: new Date('2026-09-06T10:00:00Z') },
    { id: 'S3-005', entityCode: 'CBZBANK', site: 'Group', period: '2026-Q3', scope: 'scope3', datasetType: 'Cat 5 - Waste', fuelType: null, activityData: 3.2, unit: 'tonnes', emissionFactorKgPerUnit: 21, emissionsKgCo2e: 67.2, emissionsTco2e: 0.0672, method: 'activity-based', dataQuality: 3, status: 'approved', sourceRef: 'CBZBANK_SCOPE3CAT5_WASTE_2026-Q3_v1.csv', submittedBy: 'USR-CONTRIB-BANK', submittedAt: new Date('2026-09-05T09:00:00Z'), approvedBy: 'USR-APPROVER-BANK', approvedAt: new Date('2026-09-06T10:00:00Z') },
    { id: 'S3-006', entityCode: 'CBZCAP', site: 'Group', period: '2026-Q3', scope: 'scope3', datasetType: 'Cat 6 - Business travel', fuelType: null, activityData: 42000, unit: 'pax-km', emissionFactorKgPerUnit: 0.15, emissionsKgCo2e: 6300, emissionsTco2e: 6.3, method: 'activity-based', dataQuality: 3, status: 'in_review', sourceRef: 'CBZCAP_SCOPE3CAT6_TRAVEL_2026-Q3_v1.csv', submittedBy: 'USR-ADMIN', submittedAt: new Date('2026-09-05T09:00:00Z'), approvedBy: null, approvedAt: null },
    { id: 'S3-007', entityCode: 'CBZINS', site: 'Group', period: '2026-Q3', scope: 'scope3', datasetType: 'Cat 7 - Commuting', fuelType: null, activityData: 210, unit: 'employees', emissionFactorKgPerUnit: 0.85, emissionsKgCo2e: 178.5, emissionsTco2e: 0.1785, method: 'activity-based', dataQuality: 4, status: 'draft', sourceRef: 'CBZINS_SCOPE3CAT7_COMMUTE_2026-Q3_v1.csv', submittedBy: 'USR-CONTRIB-INS', submittedAt: new Date('2026-09-05T09:00:00Z'), approvedBy: null, approvedAt: null },
    { id: 'S3-008', entityCode: 'DATVEST', site: 'Harare Office', period: '2026-Q3', scope: 'scope3', datasetType: 'Cat 8 - Leased assets', fuelType: null, activityData: 1850, unit: 'm2', emissionFactorKgPerUnit: 0.06, emissionsKgCo2e: 111, emissionsTco2e: 0.111, method: 'activity-based', dataQuality: 3, status: 'approved', sourceRef: 'DATVEST_SCOPE3CAT8_LEASE_2026-Q3_v1.csv', submittedBy: 'USR-READER-DATVEST', submittedAt: new Date('2026-09-05T09:00:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-06T10:00:00Z') },
    { id: 'S3-009', entityCode: 'CBZPROP', site: 'Borrowdale Office Park', period: '2026-Q3', scope: 'scope3', datasetType: 'Cat 13 - Tenant energy', fuelType: null, activityData: 9200, unit: 'm2', emissionFactorKgPerUnit: 0.06, emissionsKgCo2e: 552, emissionsTco2e: 0.552, method: 'activity-based', dataQuality: 3, status: 'approved', sourceRef: 'CBZPROP_SCOPE3CAT13_TENANT_2026-Q3_v1.csv', submittedBy: 'USR-ADMIN', submittedAt: new Date('2026-09-05T09:00:00Z'), approvedBy: 'USR-ADMIN', approvedAt: new Date('2026-09-06T10:00:00Z') },
  ];
  for (const em of CBZ_EMISSIONS) {
    const existing = await emRepo.findOne({ where: { id: em.id } });
    if (!existing) await emRepo.save(emRepo.create(em));
  }

  // ── Insurance policies ────────────────────────────────────────────────────
  const insRepo = ds.getRepository(CbzInsurancePolicy);
  const CBZ_INSURANCE = [
    { id: 'IE-001', segment: 'Commercial lines', subsidiary: 'CBZINS', clientId: 'CP-001', clientName: 'Mashonaland Grain Millers (Pvt) Ltd', sector: 'Agri-processing', grossWrittenPremiumUsd: 42000, denominatorType: "Client's Total Revenue", denominatorValueUsd: 6800000, clientTotalEmissions: 2850, attributionFactor: 42000/6800000, insuranceAssociatedEmissions: (42000/6800000)*2850, dqScore: 3 },
    { id: 'IE-002', segment: 'Commercial lines', subsidiary: 'CBZINS', clientId: 'CP-002', clientName: 'Manyame Textiles Ltd', sector: 'Manufacturing', grossWrittenPremiumUsd: 18500, denominatorType: "Client's Total Revenue", denominatorValueUsd: 3100000, clientTotalEmissions: 1920, attributionFactor: 18500/3100000, insuranceAssociatedEmissions: (18500/3100000)*1920, dqScore: 4 },
    { id: 'IE-003', segment: 'Commercial lines', subsidiary: 'CBZINS', clientId: 'CP-003', clientName: 'Highveld Beverages PLC', sector: 'Consumer goods', grossWrittenPremiumUsd: 96000, denominatorType: "Client's Total Revenue", denominatorValueUsd: 210000000, clientTotalEmissions: 41200, attributionFactor: 96000/210000000, insuranceAssociatedEmissions: (96000/210000000)*41200, dqScore: 4 },
    { id: 'IE-004', segment: 'Personal motor - individual data', subsidiary: 'CBZINS', clientId: 'RETAIL-3311', clientName: 'Retail Motor Policyholder #3311', sector: 'Personal transport', grossWrittenPremiumUsd: 620, denominatorType: "Client's Annual Vehicle Ownership Cost", denominatorValueUsd: 8900, clientTotalEmissions: 2.1, attributionFactor: 620/8900, insuranceAssociatedEmissions: (620/8900)*2.1, dqScore: 3 },
    { id: 'IE-005', segment: 'Personal motor - PCAF fallback factor', subsidiary: 'CBZINS', clientId: 'RETAIL-BOOK', clientName: 'Retail Motor Book (aggregated)', sector: 'Personal transport', grossWrittenPremiumUsd: 480000, denominatorType: 'PCAF Global Weighted Avg (6.99%, published constant)', denominatorValueUsd: null, clientTotalEmissions: 3650, attributionFactor: 0.0699, insuranceAssociatedEmissions: 0.0699*3650, dqScore: 5 },
    { id: 'IE-006', segment: 'Project insurance', subsidiary: 'CBZINS', clientId: 'PROJ-KARIBA', clientName: 'Kariba Hydro Extension Project', sector: 'Renewable energy', grossWrittenPremiumUsd: 165000, denominatorType: 'Insured Value / Project TE&D', denominatorValueUsd: 22000000, clientTotalEmissions: 620, attributionFactor: 0.0075, insuranceAssociatedEmissions: 4.65, dqScore: 3 },
    { id: 'IE-007', segment: 'Treaty reinsurance', subsidiary: 'CBZINS', clientId: 'RE-SABLE', clientName: 'Sable Re Treaty Panel 2026', sector: 'Reinsurance', grossWrittenPremiumUsd: 310000, denominatorType: 'Ceded Premium Share of Cedant Portfolio', denominatorValueUsd: 4200000, clientTotalEmissions: 18500, attributionFactor: 310000/4200000, insuranceAssociatedEmissions: (310000/4200000)*18500, dqScore: 5 },
  ];
  for (const ins of CBZ_INSURANCE) {
    const existing = await insRepo.findOne({ where: { id: ins.id } });
    if (!existing) await insRepo.save(insRepo.create(ins));
  }

  // ── Financial inclusion ───────────────────────────────────────────────────
  const fiRepo = ds.getRepository(CbzFinancialInclusion);
  const CBZ_FI = [
    { id: 'FI-001', subsidiary: 'CBZRED', programme: 'Rural micro-loans', beneficiaryCount: 1840, femaleShare: 0.61, totalDisbursedUsd: 620000, geography: 'Mashonaland West', sdgAlignment: 'SDG 1, SDG 5', repaymentRate: 0.92, period: '2026-Q3' },
    { id: 'FI-002', subsidiary: 'CBZRED', programme: 'Rural micro-loans', beneficiaryCount: 1120, femaleShare: 0.58, totalDisbursedUsd: 410000, geography: 'Manicaland', sdgAlignment: 'SDG 1, SDG 5', repaymentRate: 0.90, period: '2026-Q3' },
    { id: 'FI-003', subsidiary: 'CBZRED', programme: 'Rural micro-loans', beneficiaryCount: 960, femaleShare: 0.55, totalDisbursedUsd: 350000, geography: 'Masvingo', sdgAlignment: 'SDG 1, SDG 5', repaymentRate: 0.89, period: '2026-Q3' },
    { id: 'FI-004', subsidiary: 'CBZAGRO', programme: 'Mechanisation scheme', beneficiaryCount: 410, femaleShare: 0.22, totalDisbursedUsd: 2100000, geography: 'Mashonaland Central', sdgAlignment: 'SDG 2, SDG 8', repaymentRate: 0.95, period: '2026-Q3' },
    { id: 'FI-005', subsidiary: 'CBZAGRO', programme: 'Contract farming support', beneficiaryCount: 2650, femaleShare: 0.34, totalDisbursedUsd: 4800000, geography: 'Multiple provinces', sdgAlignment: 'SDG 1, SDG 2', repaymentRate: 0.91, period: '2026-Q3' },
  ];
  for (const fi of CBZ_FI) {
    const existing = await fiRepo.findOne({ where: { id: fi.id } });
    if (!existing) await fiRepo.save(fiRepo.create(fi));
  }

  // ── Workforce ─────────────────────────────────────────────────────────────
  const wfRepo = ds.getRepository(CbzWorkforce);
  const CBZ_WF = [
    { id: 'WF-CBZBANK', subsidiary: 'CBZBANK', period: '2026-Q3', headcount: 1240, femaleShare: 0.48, avgTrainingHours: 14.5, ltiRate: 0.8, voluntaryTurnover: 0.09, localHireShare: 0.97 },
    { id: 'WF-CBZCAP', subsidiary: 'CBZCAP', period: '2026-Q3', headcount: 85, femaleShare: 0.44, avgTrainingHours: 22, ltiRate: 0, voluntaryTurnover: 0.06, localHireShare: 1 },
    { id: 'WF-DATVEST', subsidiary: 'DATVEST', period: '2026-Q3', headcount: 62, femaleShare: 0.39, avgTrainingHours: 18, ltiRate: 0, voluntaryTurnover: 0.05, localHireShare: 0.98 },
    { id: 'WF-CBZAGRO', subsidiary: 'CBZAGRO', period: '2026-Q3', headcount: 310, femaleShare: 0.28, avgTrainingHours: 11, ltiRate: 1.4, voluntaryTurnover: 0.11, localHireShare: 1 },
    { id: 'WF-CBZPROP', subsidiary: 'CBZPROP', period: '2026-Q3', headcount: 45, femaleShare: 0.36, avgTrainingHours: 9.5, ltiRate: 0, voluntaryTurnover: 0.04, localHireShare: 1 },
    { id: 'WF-CBZINS', subsidiary: 'CBZINS', period: '2026-Q3', headcount: 190, femaleShare: 0.52, avgTrainingHours: 16, ltiRate: 0.2, voluntaryTurnover: 0.07, localHireShare: 0.99 },
    { id: 'WF-CBZLIFE', subsidiary: 'CBZLIFE', period: '2026-Q3', headcount: 130, femaleShare: 0.55, avgTrainingHours: 15.5, ltiRate: 0, voluntaryTurnover: 0.06, localHireShare: 0.99 },
    { id: 'WF-CBZRISK', subsidiary: 'CBZRISK', period: '2026-Q3', headcount: 38, femaleShare: 0.42, avgTrainingHours: 12, ltiRate: 0, voluntaryTurnover: 0.08, localHireShare: 1 },
    { id: 'WF-CBZRED', subsidiary: 'CBZRED', period: '2026-Q3', headcount: 420, femaleShare: 0.46, avgTrainingHours: 8, ltiRate: 0.5, voluntaryTurnover: 0.14, localHireShare: 1 },
  ];
  for (const wf of CBZ_WF) {
    const existing = await wfRepo.findOne({ where: { id: wf.id } });
    if (!existing) await wfRepo.save(wfRepo.create(wf));
  }

  // ── Incidents ─────────────────────────────────────────────────────────────
  const incRepo = ds.getRepository(CbzIncident);
  const CBZ_INC = [
    { id: 'INC-001', subsidiary: 'CBZPROP', dateReported: '2026-06-12', category: 'Environmental', description: 'Minor diesel spill during generator refuelling, Borrowdale Office Park', severity: 'Low', status: 'Closed', correctiveAction: 'Spill kit deployed, contaminated soil removed, staff retrained', closureDate: '2026-06-20' },
    { id: 'INC-002', subsidiary: 'CBZRED', dateReported: '2026-07-03', category: 'Social', description: 'Client grievance re: loan officer conduct, Masvingo hub', severity: 'Medium', status: 'Closed', correctiveAction: 'Investigated, loan officer retrained, client compensated', closureDate: '2026-07-25' },
    { id: 'INC-003', subsidiary: 'CBZBANK', dateReported: '2026-07-18', category: 'Governance', description: 'Data access control gap identified in internal audit', severity: 'Medium', status: 'Open', correctiveAction: 'RBAC remediation in progress', closureDate: null },
    { id: 'INC-004', subsidiary: 'CBZAGRO', dateReported: '2026-08-01', category: 'Environmental', description: 'Smallholder cluster flagged for possible unauthorised land clearing (GEO-004)', severity: 'Medium', status: 'Open', correctiveAction: 'Field verification scheduled with ESG champion', closureDate: null },
    { id: 'INC-005', subsidiary: 'CBZINS', dateReported: '2026-08-09', category: 'Compliance', description: 'Late regulatory return to IPEC', severity: 'Low', status: 'Closed', correctiveAction: 'Process corrected, submission calendar automated', closureDate: '2026-08-15' },
  ];
  for (const inc of CBZ_INC) {
    const existing = await incRepo.findOne({ where: { id: inc.id } });
    if (!existing) await incRepo.save(incRepo.create(inc));
  }

  // ── Risk entries ──────────────────────────────────────────────────────────
  const riskRepo = ds.getRepository(CbzRiskEntry);
  const CBZ_RISKS = [
    { id: 'RSK-001', title: 'Drought exposure — smallholder cropland (Mvurwi)', category: 'Physical', likelihood: 4, impact: 4, owner: 'Chiedza Mangwiro', status: 'Mitigating', linkedEntity: 'CBZAGRO' },
    { id: 'RSK-002', title: 'Stranded assets — mining sector (Eastlands)', category: 'Transition', likelihood: 3, impact: 5, owner: 'Kudakwashe Sithole', status: 'Monitoring', linkedEntity: 'DATVEST' },
    { id: 'RSK-003', title: 'Flood risk — Msasa Industrial Park collateral', category: 'Physical', likelihood: 2, impact: 4, owner: 'Nyasha Moyo', status: 'Identified', linkedEntity: 'CBZBANK' },
    { id: 'RSK-004', title: 'Carbon-price pass-through to project finance IRR', category: 'Transition', likelihood: 3, impact: 3, owner: 'Blessing Mutasa', status: 'Monitoring', linkedEntity: 'CBZCAP' },
    { id: 'RSK-005', title: 'Regulatory — IFRS S2 mandatory disclosure gap', category: 'Liability', likelihood: 4, impact: 3, owner: 'Anesu Mutasa', status: 'Mitigating', linkedEntity: 'GROUP' },
    { id: 'RSK-006', title: 'Underwriting concentration — climate perils on Kariba', category: 'Physical', likelihood: 3, impact: 4, owner: 'Rutendo Mukamuri', status: 'Monitoring', linkedEntity: 'CBZINS' },
    { id: 'RSK-007', title: 'Green bond origination opportunity (F22, F33)', category: 'Opportunity', likelihood: 4, impact: 3, owner: 'Blessing Mutasa', status: 'Mitigating', linkedEntity: 'CBZCAP' },
    { id: 'RSK-008', title: 'Data-quality risk — DQ score drift on retail motor book', category: 'Liability', likelihood: 3, impact: 2, owner: 'Farai Ndlovu', status: 'Identified', linkedEntity: 'CBZINS' },
  ];
  for (const risk of CBZ_RISKS) {
    const existing = await riskRepo.findOne({ where: { id: risk.id } });
    if (!existing) await riskRepo.save(riskRepo.create(risk));
  }

  // ── Geospatial ────────────────────────────────────────────────────────────
  const geoRepo = ds.getRepository(CbzGeospatial);
  const CBZ_GEO = [
    { id: 'GEO-001', linkedBorrowerName: 'Mashonaland Grain Millers (Pvt) Ltd', subsidiary: 'CBZAGRO', district: 'Mazowe', coordinates: '-17.28, 30.97', passDate: '2026-07-15', dataSource: 'Sentinel-2', ndvi: 0.71, landUse: 'Cropland - maize', areaHa: 640, deforestationFlag: 'No', floodRisk: 'Low', droughtStress: 'Medium' },
    { id: 'GEO-002', linkedBorrowerName: 'Mashonaland Grain Millers (Pvt) Ltd', subsidiary: 'CBZAGRO', district: 'Mazowe', coordinates: '-17.28, 30.97', passDate: '2026-08-14', dataSource: 'Sentinel-2', ndvi: 0.68, landUse: 'Cropland - maize', areaHa: 640, deforestationFlag: 'No', floodRisk: 'Low', droughtStress: 'Medium' },
    { id: 'GEO-003', linkedBorrowerName: 'Agro-Yield Smallholder Cluster A', subsidiary: 'CBZAGRO', district: 'Mvurwi', coordinates: '-16.97, 30.99', passDate: '2026-08-10', dataSource: 'Sentinel-2', ndvi: 0.54, landUse: 'Mixed smallholder cropland', areaHa: 185, deforestationFlag: 'No', floodRisk: 'Low', droughtStress: 'High' },
    { id: 'GEO-004', linkedBorrowerName: 'Agro-Yield Smallholder Cluster B', subsidiary: 'CBZAGRO', district: 'Mvurwi', coordinates: '-17.01, 31.05', passDate: '2026-08-10', dataSource: 'Sentinel-2', ndvi: 0.49, landUse: 'Mixed smallholder cropland', areaHa: 210, deforestationFlag: 'Possible - flagged for review', floodRisk: 'Low', droughtStress: 'High' },
    { id: 'GEO-005', linkedBorrowerName: 'Nyanga Hydro Partners (Pvt) Ltd', subsidiary: 'CBZCAP', district: 'Nyanga', coordinates: '-18.22, 32.75', passDate: '2026-08-02', dataSource: 'Landsat-9', ndvi: null, landUse: 'Forested catchment / run-of-river site', areaHa: 45, deforestationFlag: 'No', floodRisk: 'Low', droughtStress: 'Low' },
    { id: 'GEO-006', linkedBorrowerName: 'Chinhoyi Solar Partners (Pvt) Ltd', subsidiary: 'CBZCAP', district: 'Chinhoyi', coordinates: '-17.35, 30.20', passDate: '2026-08-02', dataSource: 'Sentinel-2', ndvi: 0.12, landUse: 'Cleared land / solar array', areaHa: 38, deforestationFlag: 'No', floodRisk: 'Low', droughtStress: 'Medium' },
    { id: 'GEO-007', linkedBorrowerName: 'Borrowdale Office Park (Pvt) Ltd', subsidiary: 'CBZPROP', district: 'Harare', coordinates: '-17.75, 31.09', passDate: '2026-08-05', dataSource: 'Sentinel-2', ndvi: 0.22, landUse: 'Commercial/built-up', areaHa: 3.1, deforestationFlag: 'No', floodRisk: 'Low', droughtStress: 'Low' },
    { id: 'GEO-008', linkedBorrowerName: 'Msasa Industrial Park (Pvt) Ltd', subsidiary: 'CBZBANK', district: 'Harare', coordinates: '-17.83, 31.13', passDate: '2026-08-05', dataSource: 'Sentinel-2', ndvi: 0.15, landUse: 'Industrial/built-up', areaHa: 5.4, deforestationFlag: 'No', floodRisk: 'Medium', droughtStress: 'Low' },
  ];
  for (const geo of CBZ_GEO) {
    const existing = await geoRepo.findOne({ where: { id: geo.id } });
    if (!existing) await geoRepo.save(geoRepo.create(geo));
  }

  // ── Ingestion batches ─────────────────────────────────────────────────────
  const ingRepo = ds.getRepository(CbzIngestionBatch);
  const CBZ_ING = [
    { id: 'BATCH-2601', fileName: 'CBZBANK_SCOPE1_FLEETFUEL_2026-08_v1.csv', channel: 'File Ingester (manual upload)', subsidiary: 'CBZBANK', uploadedAt: new Date('2026-09-02T08:14:00Z'), recordsProcessed: 9, validationStatus: 'Success', errorDetails: 'n/a', notificationSent: false },
    { id: 'BATCH-2602', fileName: 'CBZAGRO_GEOSPATIAL_2026-08-10_v1.geojson', channel: 'Satellite Data Ingester', subsidiary: 'CBZAGRO', uploadedAt: new Date('2026-08-10T23:02:00Z'), recordsProcessed: 2, validationStatus: 'Success', errorDetails: 'n/a', notificationSent: false },
    { id: 'BATCH-2603', fileName: 'CBZINS_SCOPE1_GENSET_2026-08_v1.csv', channel: 'File Ingester (manual upload)', subsidiary: 'CBZINS', uploadedAt: new Date('2026-09-02T09:41:00Z'), recordsProcessed: 1, validationStatus: 'Success', errorDetails: 'n/a', notificationSent: false },
    { id: 'BATCH-2604', fileName: 'CBZBANK_FINEMISSIONS_2026-Q3_v1.csv', channel: 'Ingestion API (manual)', subsidiary: 'CBZBANK', uploadedAt: new Date('2026-09-05T14:22:00Z'), recordsProcessed: 118, validationStatus: 'Partial', errorDetails: '6 records rejected: missing Denominator Value for listed-borrower rows', notificationSent: true },
    { id: 'BATCH-2605', fileName: 'DATVEST_FINEMISSIONS_2026-Q3_v2.csv', channel: 'Ingestion API (manual)', subsidiary: 'DATVEST', uploadedAt: new Date('2026-09-05T16:05:00Z'), recordsProcessed: 6, validationStatus: 'Success', errorDetails: 'Resubmission of v1 (rejected batch) after correction', notificationSent: true },
    { id: 'BATCH-2606', fileName: 'CBZPROP_SCOPE3CAT13_TENANT_2026-Q3_v1.csv', channel: 'File Ingester (manual upload)', subsidiary: 'CBZPROP', uploadedAt: new Date('2026-09-03T11:18:00Z'), recordsProcessed: 4, validationStatus: 'Failure', errorDetails: 'Invalid date format in Period column (expected YYYY-Q#)', notificationSent: true },
    { id: 'BATCH-2607', fileName: 'CBZRED_SOCIALFININCL_2026-Q3_v1.csv', channel: 'File Ingester (manual upload)', subsidiary: 'CBZRED', uploadedAt: new Date('2026-09-04T10:03:00Z'), recordsProcessed: 3, validationStatus: 'Success', errorDetails: 'n/a', notificationSent: false },
    { id: 'BATCH-2608', fileName: 'CBZCAP_FACEMISSIONS_2026_v1.csv', channel: 'Ingestion API (manual)', subsidiary: 'CBZCAP', uploadedAt: new Date('2026-09-06T13:47:00Z'), recordsProcessed: 2, validationStatus: 'Success', errorDetails: 'n/a', notificationSent: false },
    { id: 'BATCH-2609', fileName: 'CBZBANK_GOVINCIDENT_2026-07-18_v1.csv', channel: 'File Ingester (manual upload)', subsidiary: 'CBZBANK', uploadedAt: new Date('2026-07-19T09:00:00Z'), recordsProcessed: 1, validationStatus: 'Success', errorDetails: 'n/a', notificationSent: false },
    { id: 'BATCH-2610', fileName: 'CBZCAP_SCOPE3CAT6_TRAVEL_2026-Q3_v1.csv', channel: 'File Ingester (manual upload)', subsidiary: 'CBZCAP', uploadedAt: new Date('2026-09-03T15:30:00Z'), recordsProcessed: 11, validationStatus: 'Failure', errorDetails: "Mandatory field 'pax-km' blank on 3 rows", notificationSent: true },
  ];
  for (const ing of CBZ_ING) {
    const existing = await ingRepo.findOne({ where: { id: ing.id } });
    if (!existing) await ingRepo.save(ingRepo.create(ing));
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  const auditRepo = ds.getRepository(CbzAuditLog);
  const CBZ_AUDIT = [
    { id: 'AUDIT-001', timestamp: new Date('2026-09-02T08:14:00Z'), actor: 'Melissa Chirandu', action: 'INGEST', entityCode: 'CBZBANK', targetType: 'EmissionRecord', targetId: 'S1-001', detail: 'Uploaded CBZBANK Scope 1 fleet fuel for 2026-08 (9 records)' },
    { id: 'AUDIT-002', timestamp: new Date('2026-09-03T10:00:00Z'), actor: 'Tafara Chikwanha', action: 'APPROVE', entityCode: 'CBZBANK', targetType: 'EmissionRecord', targetId: 'S1-001', detail: 'Approved batch of 4 Scope 1 records for CBZBANK 2026-08' },
    { id: 'AUDIT-003', timestamp: new Date('2026-09-05T14:22:00Z'), actor: 'Anesu Mutasa', action: 'INGEST_PARTIAL', entityCode: 'CBZBANK', targetType: 'EmissionRecord', targetId: 'BATCH-2604', detail: 'Batch BATCH-2604: 118 records posted, 6 rejected (denominator missing)' },
    { id: 'AUDIT-004', timestamp: new Date('2026-09-06T10:00:00Z'), actor: 'Anesu Mutasa', action: 'APPROVE', entityCode: 'GROUP', targetType: 'EmissionRecord', targetId: 'S3-001', detail: 'Approved Group Scope 3 category 1 & 5 records' },
    { id: 'AUDIT-005', timestamp: new Date('2026-09-06T13:47:00Z'), actor: 'Blessing Mutasa', action: 'INGEST', entityCode: 'CBZCAP', targetType: 'EmissionRecord', targetId: 'BATCH-2608', detail: 'Uploaded CBZCAP facilitated emissions batch for 2026' },
  ];
  for (const entry of CBZ_AUDIT) {
    const existing = await auditRepo.findOne({ where: { id: entry.id } });
    if (!existing) await auditRepo.save(auditRepo.create(entry));
  }

  // eslint-disable-next-line no-console
  console.log('CBZ seed complete: 9 entities, 10 departments, 8 members, 18 counterparties, 19 positions, 28 emissions, 7 insurance, 5 FI, 9 workforce, 5 incidents, 8 risks, 8 geospatial, 10 ingestion, 5 audit.');
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
