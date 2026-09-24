import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Api } from './entities/api.entity';

@Injectable()
export class ApisService extends CrudService<Api> {
  constructor(@InjectRepository(Api) repository: Repository<Api>) {
    super(repository, null, 'Api');
  }
}
