import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cbz_esg_emissions', schema: 'mavhu' })
export class CbzEsgEmission {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ name: 'entity_code', type: 'varchar', length: 20 })
  entityCode: string;

  @Column({ type: 'varchar', length: 255 })
  site: string;

  @Column({ type: 'varchar', length: 20 })
  period: string;

  @Column({ type: 'varchar', length: 10 })
  scope: string;

  @Column({ name: 'dataset_type', type: 'varchar', length: 100 })
  datasetType: string;

  @Column({ name: 'fuel_type', type: 'varchar', length: 50, nullable: true })
  fuelType: string | null;

  @Column({ name: 'activity_data', type: 'decimal', precision: 15, scale: 4 })
  activityData: number;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ name: 'emission_factor_kg_per_unit', type: 'decimal', precision: 15, scale: 6 })
  emissionFactorKgPerUnit: number;

  @Column({ name: 'emissions_kg_co2e', type: 'decimal', precision: 15, scale: 4 })
  emissionsKgCo2e: number;

  @Column({ name: 'emissions_tco2e', type: 'decimal', precision: 15, scale: 6 })
  emissionsTco2e: number;

  @Column({ type: 'varchar', length: 30 })
  method: string;

  @Column({ name: 'data_quality', type: 'smallint' })
  dataQuality: number;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ name: 'source_ref', type: 'varchar', length: 255, default: '' })
  sourceRef: string;

  @Column({ name: 'submitted_by', type: 'varchar', length: 30, nullable: true })
  submittedBy: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt: Date;

  @Column({ name: 'approved_by', type: 'varchar', length: 30, nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
