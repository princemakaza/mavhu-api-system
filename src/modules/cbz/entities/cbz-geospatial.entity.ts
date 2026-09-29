import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cbz_geospatial', schema: 'mavhu' })
export class CbzGeospatial {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ name: 'linked_borrower_name', type: 'varchar', length: 255 })
  linkedBorrowerName: string;

  @Column({ type: 'varchar', length: 20 })
  subsidiary: string;

  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Column({ type: 'varchar', length: 50 })
  coordinates: string;

  @Column({ name: 'pass_date', type: 'date' })
  passDate: string;

  @Column({ name: 'data_source', type: 'varchar', length: 20 })
  dataSource: string;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  ndvi: number | null;

  @Column({ name: 'land_use', type: 'varchar', length: 255 })
  landUse: string;

  @Column({ name: 'area_ha', type: 'decimal', precision: 10, scale: 2 })
  areaHa: number;

  @Column({ name: 'deforestation_flag', type: 'varchar', length: 50 })
  deforestationFlag: string;

  @Column({ name: 'flood_risk', type: 'varchar', length: 10 })
  floodRisk: string;

  @Column({ name: 'drought_stress', type: 'varchar', length: 10 })
  droughtStress: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
