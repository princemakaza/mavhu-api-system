import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration, { AppConfig } from './config/configuration';
import { validationSchema } from './config/validation';
import { AuthModule } from './modules/auth/auth.module';
import { BanksModule } from './modules/banks/banks.module';
import { CustomersModule } from './modules/customers/customers.module';
import { BankCustomersModule } from './modules/bank-customers/bank-customers.module';
import { ApisModule } from './modules/apis/apis.module';
import { EstatesModule } from './modules/estates/estates.module';
import { RolesModule } from './modules/roles/roles.module';
import { RolePermissionsModule } from './modules/role-permissions/role-permissions.module';
import { UsersModule } from './modules/users/users.module';
import { UserRolesModule } from './modules/user-roles/user-roles.module';
import { EmissionFactorsModule } from './modules/emission-factors/emission-factors.module';
import { SatelliteNdviCo2Module } from './modules/satellite-ndvi-co2/satellite-ndvi-co2.module';
import { CropCyclesModule } from './modules/crop-cycles/crop-cycles.module';
import { EmissionsAccountingModule } from './modules/emissions-accounting/emissions-accounting.module';
import { CbzModule } from './modules/cbz/cbz.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<{ database: AppConfig['database'] }, true>) => {
        const db = configService.get('database', { infer: true });
        return {
          type: 'postgres' as const,
          host: db.host,
          port: db.port,
          username: db.user,
          password: db.password,
          database: db.name,
          schema: db.schema,
          autoLoadEntities: true,
          // The schema (tables, triggers, enums) is owned and versioned by
          // mavhu_database_manager's init.sql / models / run_migrations.sh —
          // this API only ever reads/writes through it, never mutates DDL.
          synchronize: false,
          migrationsRun: false,
          logging: db.logging,
        };
      },
    }),
    AuthModule,
    BanksModule,
    CustomersModule,
    BankCustomersModule,
    ApisModule,
    EstatesModule,
    RolesModule,
    RolePermissionsModule,
    UsersModule,
    UserRolesModule,
    EmissionFactorsModule,
    SatelliteNdviCo2Module,
    CropCyclesModule,
    EmissionsAccountingModule,
    CbzModule,
  ],
})
export class AppModule {}
