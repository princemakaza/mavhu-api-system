import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const BANK_STATUSES = ['onboarding', 'active', 'suspended'] as const;
/** Dashboard tabs a bank can be licensed for; mirrors the frontend's tab keys. */
export const DASHBOARD_MODULES = [
  'snapshot',
  'portfolio',
  'insurance',
  'risk',
  'predictive',
  'workflow',
  'entity',
  'data-entry',
  'members',
] as const;
/** Bank portal roles. auditor = read-only assurer (RFP F19/F38). */
export const MEMBER_ROLES = ['admin', 'approver', 'contributor', 'reader', 'auditor', 'customer'] as const;
/** Platform roles the admin console can grant to MAvHU staff. */
export const TEAM_ROLES = ['MAVHU_ADMIN', 'AUDITOR'] as const;

export class CreateEntityDto {
  @ApiProperty({ example: 'STANBANK', description: 'Unique subsidiary code, capitals and digits' })
  @Matches(/^[A-Z0-9]{2,20}$/, { message: 'code must be 2-20 capital letters or digits' })
  code: string;

  @ApiProperty({ example: 'Stanbic Bank Zimbabwe' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Commercial banking' })
  @IsString()
  @MaxLength(255)
  segment: string;

  @ApiProperty({ example: 'RBZ' })
  @IsString()
  @MaxLength(100)
  regulator: string;

  @ApiPropertyOptional({ example: 'A (lending)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pcafApplicable?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BankAdminDto {
  @ApiProperty({ example: 'Tatenda Mhlanga' })
  @IsString()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({ example: 'tatenda.mhlanga@stanbicbank.co.zw' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class AdminCreateBankDto {
  @ApiProperty({ example: 'Stanbic Bank Zimbabwe' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Zimbabwe' })
  @IsString()
  @MaxLength(255)
  country: string;

  @ApiProperty({ example: 'contact@stanbicbank.co.zw' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+263242759480' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  phoneNumber?: string;

  @ApiProperty({ example: 'STANBIC-ZW-001' })
  @IsString()
  @MaxLength(255)
  identifier: string;

  @ApiPropertyOptional({ enum: BANK_STATUSES, default: 'onboarding' })
  @IsOptional()
  @IsIn(BANK_STATUSES)
  status?: (typeof BANK_STATUSES)[number];

  @ApiPropertyOptional({ enum: DASHBOARD_MODULES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(DASHBOARD_MODULES, { each: true })
  modules?: string[];

  @ApiPropertyOptional({ type: CreateEntityDto, description: 'First subsidiary, created with the bank' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEntityDto)
  firstEntity?: CreateEntityDto;

  @ApiPropertyOptional({ type: BankAdminDto, description: 'Bank administrator account in the first subsidiary' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankAdminDto)
  bankAdmin?: BankAdminDto;
}

export class AdminUpdateBankDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  identifier?: string;

  @ApiPropertyOptional({ enum: BANK_STATUSES })
  @IsOptional()
  @IsIn(BANK_STATUSES)
  status?: (typeof BANK_STATUSES)[number];

  @ApiPropertyOptional({ enum: DASHBOARD_MODULES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(DASHBOARD_MODULES, { each: true })
  modules?: string[];
}

export class AdminCreateMemberDto {
  @ApiProperty({ example: 'Rudo Chikwanha' })
  @IsString()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({ example: 'rudo.chikwanha@cbz.co.zw' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+263 77 123 4567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ example: 'MAINBANK', description: 'Subsidiary code' })
  @IsString()
  entityCode: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @ApiProperty({ enum: MEMBER_ROLES })
  @IsIn(MEMBER_ROLES)
  role: (typeof MEMBER_ROLES)[number];

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class AdminUpdateMemberDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityCode?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @ApiPropertyOptional({ enum: MEMBER_ROLES })
  @IsOptional()
  @IsIn(MEMBER_ROLES)
  role?: (typeof MEMBER_ROLES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class CreateTeamMemberDto {
  @ApiProperty({ example: 'Farai Ncube' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'farai.ncube@mavhu.africa' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: TEAM_ROLES, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(TEAM_ROLES, { each: true })
  roles: string[];
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ enum: TEAM_ROLES, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(TEAM_ROLES, { each: true })
  roles?: string[];

  @ApiPropertyOptional({ description: 'false deactivates the account (soft delete)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetPeriodDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  bankId: number;

  @ApiProperty({ example: '2026-Q3', description: 'YYYY-MM or YYYY-Qn' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2]|Q[1-4])$/, { message: 'period must look like 2026-08 or 2026-Q3' })
  period: string;

  @ApiProperty({ enum: ['open', 'locked'] })
  @IsIn(['open', 'locked'])
  status: 'open' | 'locked';
}
