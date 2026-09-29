import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cbz_financial_inclusion', schema: 'mavhu' })
export class CbzFinancialInclusion {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  subsidiary: string;

  @Column({ type: 'varchar', length: 255 })
  programme: string;

  @Column({ name: 'beneficiary_count', type: 'int' })
  beneficiaryCount: number;

  @Column({ name: 'female_share', type: 'decimal', precision: 5, scale: 4 })
  femaleShare: number;

  @Column({ name: 'total_disbursed_usd', type: 'decimal', precision: 15, scale: 2 })
  totalDisbursedUsd: number;

  @Column({ type: 'varchar', length: 255 })
  geography: string;

  @Column({ name: 'sdg_alignment', type: 'varchar', length: 255 })
  sdgAlignment: string;

  @Column({ name: 'repayment_rate', type: 'decimal', precision: 5, scale: 4 })
  repaymentRate: number;

  @Column({ type: 'varchar', length: 20 })
  period: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
