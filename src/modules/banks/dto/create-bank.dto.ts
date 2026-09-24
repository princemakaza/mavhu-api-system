import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBankDto {
  @ApiProperty({ example: 'First National Bank', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Zimbabwe', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  country: string;

  @ApiProperty({ example: 'contact@fnb.co.zw', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: '+263771234567', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  phoneNumber?: string;

  @ApiProperty({ example: 'FNB-ZW-001', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  identifier: string;
}
