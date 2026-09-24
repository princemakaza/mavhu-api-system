import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmissionsAccounting } from './entities/emissions-accounting.entity';
import { EmissionsAccountingController } from './emissions-accounting.controller';
import { EmissionsAccountingService } from './emissions-accounting.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmissionsAccounting])],
  controllers: [EmissionsAccountingController],
  providers: [EmissionsAccountingService],
  exports: [EmissionsAccountingService],
})
export class EmissionsAccountingModule {}
