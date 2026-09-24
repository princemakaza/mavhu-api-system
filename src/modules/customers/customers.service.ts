import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService extends CrudService<Customer> {
  constructor(@InjectRepository(Customer) repository: Repository<Customer>) {
    super(repository, 'isDeleted', 'Customer');
  }
}
