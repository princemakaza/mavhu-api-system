import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { UserRole } from './entities/user-role.entity';

@Injectable()
export class UserRolesService extends CrudService<UserRole> {
  constructor(@InjectRepository(UserRole) repository: Repository<UserRole>) {
    super(repository, null, 'UserRole');
  }

  /** All role ids assigned to a user — used by AuthService to build a login token's role claims. */
  async findRoleIdsByUserId(userId: number): Promise<number[]> {
    const links = await this.repository.find({ where: { userId } });
    return links.map((link) => link.roleId);
  }
}
