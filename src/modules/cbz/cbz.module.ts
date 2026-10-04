import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../config/configuration';
import { Bank } from '../banks/entities/bank.entity';
import { CbzController } from './cbz.controller';
import { CbzService } from './cbz.service';
import { CbzImportService } from './import/cbz-import.service';
import { CbzAuditLog } from './entities/cbz-audit-log.entity';
import { CbzCounterparty } from './entities/cbz-counterparty.entity';
import { CbzDepartment } from './entities/cbz-department.entity';
import { CbzEntity } from './entities/cbz-entity.entity';
import { CbzEsgEmission } from './entities/cbz-esg-emission.entity';
import { CbzFinancedPosition } from './entities/cbz-financed-position.entity';
import { CbzFinancialInclusion } from './entities/cbz-financial-inclusion.entity';
import { CbzGeospatial } from './entities/cbz-geospatial.entity';
import { CbzIncident } from './entities/cbz-incident.entity';
import { CbzIngestionBatch } from './entities/cbz-ingestion-batch.entity';
import { CbzInsurancePolicy } from './entities/cbz-insurance-policy.entity';
import { CbzMember } from './entities/cbz-member.entity';
import { CbzReportingPeriod } from './entities/cbz-reporting-period.entity';
import { CbzRiskEntry } from './entities/cbz-risk-entry.entity';
import { CbzWorkforce } from './entities/cbz-workforce.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Bank,
      CbzEntity,
      CbzDepartment,
      CbzMember,
      CbzCounterparty,
      CbzFinancedPosition,
      CbzEsgEmission,
      CbzInsurancePolicy,
      CbzFinancialInclusion,
      CbzWorkforce,
      CbzIncident,
      CbzRiskEntry,
      CbzGeospatial,
      CbzIngestionBatch,
      CbzAuditLog,
      CbzReportingPeriod,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService<{ jwt: AppConfig['jwt'] }, true>) => {
        const jwt = cs.get('jwt', { infer: true });
        return { secret: jwt.secret, signOptions: { expiresIn: jwt.expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}` } };
      },
    }),
  ],
  controllers: [CbzController],
  providers: [CbzService, CbzImportService],
  exports: [CbzService, TypeOrmModule, JwtModule],
})
export class CbzModule {}
