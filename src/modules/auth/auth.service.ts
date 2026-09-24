import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppConfig } from '../../config/configuration';
import { RolesService } from '../roles/roles.service';
import { UserRolesService } from '../user-roles/user-roles.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { SELF_REGISTRABLE_ROLES } from './auth.constants';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly jwtExpiresIn: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly userRolesService: UserRolesService,
    private readonly jwtService: JwtService,
    configService: ConfigService<{ jwt: AppConfig['jwt'] }, true>,
  ) {
    this.jwtExpiresIn = configService.get('jwt', { infer: true }).expiresIn;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const restricted = (dto.roleNames ?? []).filter((name) => !SELF_REGISTRABLE_ROLES.includes(name));
    if (restricted.length > 0) {
      throw new ForbiddenException(
        `Role(s) ${restricted.join(', ')} cannot be self-registered; they are provisioned by Mavhu`,
      );
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email is already registered');
    }

    const user = await this.usersService.create({
      name: dto.name,
      customerId: dto.customerId,
      estateId: dto.estateId,
      email: dto.email,
      password: dto.password,
    });

    const roleNames: string[] = [];
    for (const roleName of dto.roleNames ?? []) {
      const role = await this.rolesService.findByName(roleName);
      await this.userRolesService.create({ userId: user.id, roleId: role.id, auditTrail: 'Assigned at registration' });
      roleNames.push(role.name);
    }

    return this.buildAuthResponse(user, roleNames);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const roleIds = await this.userRolesService.findRoleIdsByUserId(user.id);
    const roles = await Promise.all(roleIds.map((roleId) => this.rolesService.findOne(roleId)));

    return this.buildAuthResponse(
      user,
      roles.map((role) => role.name),
    );
  }

  private buildAuthResponse(user: User, roles: string[]): AuthResponseDto {
    const payload: JwtPayload = { sub: user.id, email: user.email, roles };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.jwtExpiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        customerId: user.customerId,
        estateId: user.estateId,
        roles,
      },
    };
  }
}
