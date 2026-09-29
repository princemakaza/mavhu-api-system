import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cbz_incidents', schema: 'mavhu' })
export class CbzIncident {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  subsidiary: string;

  @Column({ name: 'date_reported', type: 'date' })
  dateReported: string;

  @Column({ type: 'varchar', length: 30 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20 })
  severity: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ name: 'corrective_action', type: 'text', default: '' })
  correctiveAction: string;

  @Column({ name: 'closure_date', type: 'date', nullable: true })
  closureDate: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
