import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class CreateRolePermissionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  roleId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  apiId: number;
}
