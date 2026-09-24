import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateApiDto {
  @ApiProperty({ example: 'emissions_accounting.write', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;
}
