import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cbz_insurance_policies', schema: 'mavhu' })
export class CbzInsurancePolicy {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  segment: string;

  @Column({ type: 'varchar', length: 20 })
  subsidiary: string;

  @Column({ name: 'client_id', type: 'varchar', length: 50 })
  clientId: string;

  @Column({ name: 'client_name', type: 'varchar', length: 255 })
  clientName: string;

  @Column({ type: 'varchar', length: 100 })
  sector: string;

  @Column({ name: 'gross_written_premium_usd', type: 'decimal', precision: 15, scale: 2 })
  grossWrittenPremiumUsd: number;

  @Column({ name: 'denominator_type', type: 'varchar', length: 255 })
  denominatorType: string;

  @Column({ name: 'denominator_value_usd', type: 'decimal', precision: 20, scale: 2, nullable: true })
  denominatorValueUsd: number | null;

  @Column({ name: 'client_total_emissions', type: 'decimal', precision: 15, scale: 4 })
  clientTotalEmissions: number;

  @Column({ name: 'attribution_factor', type: 'decimal', precision: 15, scale: 8 })
  attributionFactor: number;

  @Column({ name: 'insurance_associated_emissions', type: 'decimal', precision: 15, scale: 4 })
  insuranceAssociatedEmissions: number;

  @Column({ name: 'dq_score', type: 'smallint' })
  dqScore: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
