import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cbz_risk_entries', schema: 'mavhu' })
export class CbzRiskEntry {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 30 })
  category: string;

  @Column({ type: 'smallint' })
  likelihood: number;

  @Column({ type: 'smallint' })
  impact: number;

  @Column({ type: 'varchar', length: 255 })
  owner: string;

  @Column({ type: 'varchar', length: 30 })
  status: string;

  @Column({ name: 'linked_entity', type: 'varchar', length: 20 })
  linkedEntity: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
