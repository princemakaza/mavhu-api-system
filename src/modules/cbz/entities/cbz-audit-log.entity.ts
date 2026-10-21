import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'cbz_audit_log', schema: 'mavhu' })
export class CbzAuditLog {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'varchar', length: 255 })
  actor: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'entity_code', type: 'varchar', length: 20, nullable: true })
  entityCode: string | null;

  @Column({ name: 'target_type', type: 'varchar', length: 30 })
  targetType: string;

  @Column({ name: 'target_id', type: 'varchar', length: 50, nullable: true })
  targetId: string | null;

  @Column({ type: 'text', default: '' })
  detail: string;

  @Column({ name: 'bank_id', type: 'int', nullable: true })
  bankId: number | null;

  /** Insertion order, assigned by the database; the hash chain follows it. */
  @Column({ type: 'bigint', insert: false, update: false })
  seq: string;

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, unknown> | null;

  @Column({ name: 'prev_hash', type: 'varchar', length: 64, nullable: true })
  prevHash: string | null;

  /** SHA-256 over prevHash and every field of this row: editing any row breaks the chain. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  hash: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
