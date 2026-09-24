import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { CustomerIdentifier } from '../entities/customer-identifier.enum';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Green Valley Estates', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 500, description: 'Total hectares under management' })
  @IsInt()
  @IsPositive()
  hectares: number;

  @ApiProperty({ example: 'Zimbabwe', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  country: string;

  @ApiProperty({ example: 'ops@greenvalley.co.zw', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: '+263771234567', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  phoneNumber?: string;

  @ApiProperty({ enum: CustomerIdentifier, example: CustomerIdentifier.AGROBUSINESS })
  @IsEnum(CustomerIdentifier)
  identifier: CustomerIdentifier;
}
