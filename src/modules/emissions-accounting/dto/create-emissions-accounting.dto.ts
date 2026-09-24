import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateEmissionsAccountingDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  customerId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  estateId: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  createdBy?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  cropCycleId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  emissionId: number;

  @ApiProperty({ example: 150.5 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-03-31T00:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'quantity * emission_factors.factor / 1000', nullable: true })
  @IsOptional()
  @IsNumber()
  tonCo2e?: number;

  @ApiProperty({ example: 1, minimum: 1, maximum: 3 })
  @IsInt()
  @Min(1)
  @Max(3)
  scope: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  approvedBy?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  auditTrail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
