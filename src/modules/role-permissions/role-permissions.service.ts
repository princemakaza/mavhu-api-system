import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { RolePermission } from './entities/role-permission.entity';

@Injectable()
export class RolePermissionsService extends CrudService<RolePermission> {
  constructor(@InjectRepository(RolePermission) repository: Repository<RolePermission>) {
    super(repository, null, 'RolePermission');
  }
}
