import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Estate } from './entities/estate.entity';

@Injectable()
export class EstatesService extends CrudService<Estate> {
  constructor(@InjectRepository(Estate) repository: Repository<Estate>) {
    super(repository, null, 'Estate');
  }
}
