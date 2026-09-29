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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
