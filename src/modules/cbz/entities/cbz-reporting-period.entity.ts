import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** A bank's reporting period; once locked, emission records in it can no longer be added or advanced. */
@Entity({ name: 'cbz_reporting_periods', schema: 'mavhu' })
export class CbzReportingPeriod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bank_id', type: 'int' })
  bankId: number;

  @Column({ type: 'varchar', length: 20 })
  period: string;

  @Column({ type: 'varchar', length: 10, default: 'open' })
  status: 'open' | 'locked';

  @Column({ name: 'locked_by', type: 'varchar', length: 255, nullable: true })
  lockedBy: string | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
