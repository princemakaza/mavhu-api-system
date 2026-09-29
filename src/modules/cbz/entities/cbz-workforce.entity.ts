import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cbz_workforce', schema: 'mavhu' })
export class CbzWorkforce {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  subsidiary: string;

  @Column({ type: 'varchar', length: 20 })
  period: string;

  @Column({ type: 'int' })
  headcount: number;

  @Column({ name: 'female_share', type: 'decimal', precision: 5, scale: 4 })
  femaleShare: number;

  @Column({ name: 'avg_training_hours', type: 'decimal', precision: 8, scale: 2 })
  avgTrainingHours: number;

  @Column({ name: 'lti_rate', type: 'decimal', precision: 8, scale: 4 })
  ltiRate: number;

  @Column({ name: 'voluntary_turnover', type: 'decimal', precision: 5, scale: 4 })
  voluntaryTurnover: number;

  @Column({ name: 'local_hire_share', type: 'decimal', precision: 5, scale: 4 })
  localHireShare: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
