import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CropCyclesController } from './crop-cycles.controller';
import { CropCyclesService } from './crop-cycles.service';
import { CropCycle } from './entities/crop-cycle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CropCycle])],
  controllers: [CropCyclesController],
  providers: [CropCyclesService],
  exports: [CropCyclesService],
})
export class CropCyclesModule {}
