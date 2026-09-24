import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DeepPartial, Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { User } from './entities/user.entity';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService extends CrudService<User> {
  constructor(@InjectRepository(User) repository: Repository<User>) {
    super(repository, 'isDeleted', 'User');
  }

  override async create(dto: DeepPartial<User>): Promise<User> {
    return super.create(await this.withHashedPassword(dto));
  }

  override async update(id: number, dto: DeepPartial<User>): Promise<User> {
    return super.update(id, await this.withHashedPassword(dto));
  }

  override async replace(id: number, dto: DeepPartial<User>): Promise<User> {
    return super.replace(id, await this.withHashedPassword(dto));
  }

  private async withHashedPassword(dto: DeepPartial<User>): Promise<DeepPartial<User>> {
    if (!dto.password) {
      return dto;
    }
    return { ...dto, password: await bcrypt.hash(dto.password as string, SALT_ROUNDS) };
  }

  /** Includes the hashed password column — used by AuthService to verify login credentials. */
  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }
}
