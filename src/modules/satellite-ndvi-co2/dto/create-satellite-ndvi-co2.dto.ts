import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class CreateSatelliteNdviCo2Dto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  customerId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  estateId: number;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndviMean?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndviMin?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndviMax?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndviStd?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndwiMean?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndwiMin?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndwiMax?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndwiStd?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndbiMean?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndbiMin?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndbiMax?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  ndbiStd?: number;

  @ApiPropertyOptional({ description: '45.8 * (ndvi_max ^ 2.1)' })
  @IsOptional()
  @IsNumber()
  aboveGroundBiomass?: number;

  @ApiPropertyOptional({ description: '0.24 * above_ground_biomass' })
  @IsOptional()
  @IsNumber()
  belowGroundBiomass?: number;

  @ApiPropertyOptional({ description: '(above_ground_biomass + below_ground_biomass) * 0.47' })
  @IsOptional()
  @IsNumber()
  biomassCarbon?: number;

  @ApiPropertyOptional({ description: 'biomass_carbon * 3.67' })
  @IsOptional()
  @IsNumber()
  biomassCo2?: number;

  @ApiPropertyOptional({ description: 'biomass_co2 * estate hectares' })
  @IsOptional()
  @IsNumber()
  biomassCo2Total?: number;

  @ApiPropertyOptional({ description: '(82.77 * ndvi_max) - 1.39' })
  @IsOptional()
  @IsNumber()
  soilOrganicCarbon?: number;

  @ApiPropertyOptional({ description: 'soil_organic_carbon * 3.67' })
  @IsOptional()
  @IsNumber()
  soilOrganicCarbonCo2?: number;

  @ApiPropertyOptional({ description: 'soil_organic_carbon_co2 * estate hectares' })
  @IsOptional()
  @IsNumber()
  soilOrganicCarbonCo2Total?: number;

  @ApiPropertyOptional({ description: 'biomass_co2_total + soil_organic_carbon_co2_total' })
  @IsOptional()
  @IsNumber()
  netCo2Stock?: number;
}
