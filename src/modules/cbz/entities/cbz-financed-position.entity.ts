import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cbz_financed_positions', schema: 'mavhu' })
export class CbzFinancedPosition {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ name: 'counterparty_id', type: 'varchar', length: 20 })
  counterpartyId: string;

  @Column({ name: 'outstanding_amount_usd', type: 'decimal', precision: 15, scale: 2 })
  outstandingAmountUsd: number;

  @Column({ type: 'varchar', length: 20 })
  period: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
