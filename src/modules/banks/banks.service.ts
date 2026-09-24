import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Bank } from './entities/bank.entity';

@Injectable()
export class BanksService extends CrudService<Bank> {
  constructor(@InjectRepository(Bank) repository: Repository<Bank>) {
    super(repository, 'isDeleted', 'Bank');
  }
}
