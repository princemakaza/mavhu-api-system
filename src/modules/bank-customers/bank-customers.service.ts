import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { BankCustomer } from './entities/bank-customer.entity';

@Injectable()
export class BankCustomersService extends CrudService<BankCustomer> {
  constructor(@InjectRepository(BankCustomer) repository: Repository<BankCustomer>) {
    super(repository, null, 'BankCustomer');
  }
}
