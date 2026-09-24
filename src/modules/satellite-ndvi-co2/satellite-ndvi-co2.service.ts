import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { SatelliteNdviCo2 } from './entities/satellite-ndvi-co2.entity';

@Injectable()
export class SatelliteNdviCo2Service extends CrudService<SatelliteNdviCo2> {
  constructor(@InjectRepository(SatelliteNdviCo2) repository: Repository<SatelliteNdviCo2>) {
    super(repository, null, 'SatelliteNdviCo2');
  }
}
