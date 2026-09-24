import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { EmissionFactor } from './entities/emission-factor.entity';

@Injectable()
export class EmissionFactorsService extends CrudService<EmissionFactor> {
  constructor(@InjectRepository(EmissionFactor) repository: Repository<EmissionFactor>) {
    super(repository, null, 'EmissionFactor');
  }
}
