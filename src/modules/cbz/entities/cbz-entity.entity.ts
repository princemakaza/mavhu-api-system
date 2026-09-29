import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cbz_entities', schema: 'mavhu' })
export class CbzEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  segment: string;

  @Column({ type: 'varchar', length: 100 })
  regulator: string;

  @Column({ name: 'pcaf_applicable', type: 'varchar', length: 255, default: '' })
  pcafApplicable: string;

  @Column({ type: 'text', default: '' })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
