import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { CropCycle } from './entities/crop-cycle.entity';

@Injectable()
export class CropCyclesService extends CrudService<CropCycle> {
  constructor(@InjectRepository(CropCycle) repository: Repository<CropCycle>) {
    super(repository, null, 'CropCycle');
  }
}
