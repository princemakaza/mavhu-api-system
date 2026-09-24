import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateEstateDto {
  @ApiProperty({ example: 'North Block Estate', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 120, description: 'Hectares covered by this estate' })
  @IsInt()
  @IsPositive()
  hectares: number;

  @ApiProperty({ example: 1, description: 'Owning customer id' })
  @IsInt()
  @IsPositive()
  customerId: number;

  @ApiProperty({ example: 'Zimbabwe', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  country: string;

  @ApiProperty({ example: 'estate@greenvalley.co.zw', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: '+263771234567', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  phoneNumber?: string;
}
