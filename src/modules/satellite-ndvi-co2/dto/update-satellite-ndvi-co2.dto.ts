import { PartialType } from '@nestjs/swagger';
import { CreateSatelliteNdviCo2Dto } from './create-satellite-ndvi-co2.dto';

export class UpdateSatelliteNdviCo2Dto extends PartialType(CreateSatelliteNdviCo2Dto) {}
