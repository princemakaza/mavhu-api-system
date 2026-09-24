import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SatelliteNdviCo2 } from './entities/satellite-ndvi-co2.entity';
import { SatelliteNdviCo2Controller } from './satellite-ndvi-co2.controller';
import { SatelliteNdviCo2Service } from './satellite-ndvi-co2.service';

@Module({
  imports: [TypeOrmModule.forFeature([SatelliteNdviCo2])],
  controllers: [SatelliteNdviCo2Controller],
  providers: [SatelliteNdviCo2Service],
  exports: [SatelliteNdviCo2Service],
})
export class SatelliteNdviCo2Module {}
