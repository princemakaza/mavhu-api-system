import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** One entry in a bank register (targets, suppliers, stakeholders, …); fields validated per register by the API. */
@Entity({ name: 'cbz_register_items', schema: 'mavhu' })
export class CbzRegisterItem {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ name: 'bank_id', type: 'int' })
  bankId: number;

  @Column({ type: 'varchar', length: 40 })
  register: string;

  @Column({ name: 'entity_code', type: 'varchar', length: 20, nullable: true })
  entityCode: string | null;

  @Column({ type: 'jsonb' })
  data: Record<string, unknown>;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 255, nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
