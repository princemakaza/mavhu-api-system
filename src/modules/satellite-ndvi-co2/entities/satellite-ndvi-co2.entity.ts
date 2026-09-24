import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';
import { Customer } from '../../customers/entities/customer.entity';
import { Estate } from '../../estates/entities/estate.entity';

const index = (precision: number, scale: number) => ({
  type: 'decimal' as const,
  precision,
  scale,
  nullable: true,
  transformer: new DecimalTransformer(),
});

@Entity({ name: 'satellite_ndvi_co2', schema: 'mavhu' })
export class SatelliteNdviCo2 {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @ApiProperty({ example: 1 })
  @Column({ name: 'estate_id', type: 'int' })
  estateId: number;

  @ManyToOne(() => Estate, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'estate_id' })
  estate?: Estate;

  @ApiProperty({ example: '2026-03-01' })
  @Column({ type: 'date' })
  date: string;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndvi_mean', ...index(16, 15) })
  ndviMean: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndvi_min', ...index(16, 15) })
  ndviMin: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndvi_max', ...index(16, 15) })
  ndviMax: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndvi_std', ...index(16, 15) })
  ndviStd: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndwi_mean', ...index(16, 15) })
  ndwiMean: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndwi_min', ...index(16, 15) })
  ndwiMin: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndwi_max', ...index(16, 15) })
  ndwiMax: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndwi_std', ...index(16, 15) })
  ndwiStd: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndbi_mean', ...index(16, 15) })
  ndbiMean: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndbi_min', ...index(16, 15) })
  ndbiMin: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndbi_max', ...index(16, 15) })
  ndbiMax: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: -1, maximum: 1 })
  @Column({ name: 'ndbi_std', ...index(16, 15) })
  ndbiStd: number | null;

  @ApiProperty({ required: false, nullable: true, description: '45.8 * (ndvi_max ^ 2.1)' })
  @Column({ name: 'above_ground_biomass', ...index(7, 4) })
  aboveGroundBiomass: number | null;

  @ApiProperty({ required: false, nullable: true, description: '0.24 * above_ground_biomass' })
  @Column({ name: 'below_ground_biomass', ...index(7, 4) })
  belowGroundBiomass: number | null;

  @ApiProperty({ required: false, nullable: true, description: '(above_ground_biomass + below_ground_biomass) * 0.47' })
  @Column({ name: 'biomass_carbon', ...index(7, 4) })
  biomassCarbon: number | null;

  @ApiProperty({ required: false, nullable: true, description: 'biomass_carbon * 3.67' })
  @Column({ name: 'biomass_co2', ...index(7, 4) })
  biomassCo2: number | null;

  @ApiProperty({ required: false, nullable: true, description: 'biomass_co2 * estate hectares' })
  @Column({ name: 'biomass_co2_total', ...index(10, 4) })
  biomassCo2Total: number | null;

  @ApiProperty({ required: false, nullable: true, description: '(82.77 * ndvi_max) - 1.39' })
  @Column({ name: 'soil_organic_carbon', ...index(7, 4) })
  soilOrganicCarbon: number | null;

  @ApiProperty({ required: false, nullable: true, description: 'soil_organic_carbon * 3.67' })
  @Column({ name: 'soil_organic_carbon_co2', ...index(7, 4) })
  soilOrganicCarbonCo2: number | null;

  @ApiProperty({ required: false, nullable: true, description: 'soil_organic_carbon_co2 * estate hectares' })
  @Column({ name: 'soil_organic_carbon_co2_total', ...index(10, 4) })
  soilOrganicCarbonCo2Total: number | null;

  @ApiProperty({ required: false, nullable: true, description: 'biomass_co2_total + soil_organic_carbon_co2_total' })
  @Column({ name: 'net_co2_stock', ...index(10, 4) })
  netCo2Stock: number | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
