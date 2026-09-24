import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'ESG_CONTRIBUTOR', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;
}
