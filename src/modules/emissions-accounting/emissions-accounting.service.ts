import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { EmissionsAccounting } from './entities/emissions-accounting.entity';

@Injectable()
export class EmissionsAccountingService extends CrudService<EmissionsAccounting> {
  constructor(@InjectRepository(EmissionsAccounting) repository: Repository<EmissionsAccounting>) {
    super(repository, null, 'EmissionsAccounting');
  }
}
