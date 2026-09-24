import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateUserRoleDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  userId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  roleId: number;

  @ApiPropertyOptional({ example: 'Granted by admin@mavhu.com on onboarding' })
  @IsOptional()
  @IsString()
  auditTrail?: string;
}
