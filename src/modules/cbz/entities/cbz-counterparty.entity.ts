import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cbz_counterparties', schema: 'mavhu' })
export class CbzCounterparty {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  sector: string;

  @Column({ name: 'listed_status', type: 'varchar', length: 20 })
  listedStatus: string;

  @Column({ name: 'asset_class', type: 'varchar', length: 50 })
  assetClass: string;

  @Column({ type: 'varchar', length: 20 })
  subsidiary: string;

  @Column({ type: 'jsonb', default: '{}' })
  financials: Record<string, number>;

  @Column({ name: 'total_emissions_tco2e', type: 'decimal', precision: 15, scale: 4, default: 0 })
  totalEmissionsTco2e: number;

  @Column({ name: 'dq_score', type: 'smallint' })
  dqScore: number;

  @Column({ name: 'mrv_enhanced', type: 'boolean', default: false })
  mrvEnhanced: boolean;

  /** Sustainable-finance taxonomy tag (F22/F33), e.g. ICMA GBP / AfDB. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  taxonomy: string | null;

  @Column({ name: 'taxonomy_category', type: 'varchar', length: 120, nullable: true })
  taxonomyCategory: string | null;

  /** Eligible / Aligned / Not eligible / Under review. */
  @Column({ name: 'taxonomy_status', type: 'varchar', length: 20, nullable: true })
  taxonomyStatus: string | null;

  /** The MAvHU MRV customer (agribusiness) this borrower is, when its land is monitored. */
  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
