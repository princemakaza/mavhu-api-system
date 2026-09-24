import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService extends CrudService<Role> {
  constructor(@InjectRepository(Role) repository: Repository<Role>) {
    super(repository, null, 'Role');
  }

  /** Looks up a role by its unique name (e.g. "ESG_CONTRIBUTOR") — used when registering a user with named roles. */
  async findByName(name: string): Promise<Role> {
    const role = await this.repository.findOne({ where: { name } });
    if (!role) {
      throw new NotFoundException(`Role "${name}" not found`);
    }
    return role;
  }
}
