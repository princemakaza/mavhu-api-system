import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MavhuAdminGuard } from '../../common/auth/mavhu-admin.guard';
import { CbzModule } from '../cbz/cbz.module';
import { Customer } from '../customers/entities/customer.entity';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { User } from '../users/entities/user.entity';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';

/** The MAvHU team's console: onboard banks, manage every bank's users and roles, lock periods, audit. */
@Module({
  // CbzModule exports its repositories (Bank, cbz_*) and the JwtModule the guard verifies with.
  imports: [CbzModule, TypeOrmModule.forFeature([User, Role, UserRole, Customer])],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, MavhuAdminGuard],
})
export class PlatformAdminModule {}
