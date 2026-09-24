import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { AppModule } from '../app.module';
import { Bank } from '../modules/banks/entities/bank.entity';
import { BankCustomer } from '../modules/bank-customers/entities/bank-customer.entity';
import { CustomerIdentifier } from '../modules/customers/entities/customer-identifier.enum';
import { Customer } from '../modules/customers/entities/customer.entity';
import { Estate } from '../modules/estates/entities/estate.entity';
import { RolesService } from '../modules/roles/roles.service';
import { UserRolesService } from '../modules/user-roles/user-roles.service';
import { UsersService } from '../modules/users/users.service';

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
  await app.close();
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
