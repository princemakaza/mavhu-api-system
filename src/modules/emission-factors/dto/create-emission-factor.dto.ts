import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmissionFactorDto {
  @ApiProperty({ example: 'Diesel', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Combustion', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  component: string;

  @ApiProperty({ example: 2.6801 })
  @IsNumber()
  factor: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  gwp: number;

  @ApiPropertyOptional({ example: 'kg CO2e per litre of diesel burned', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 'litre', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  unit: string;
}
