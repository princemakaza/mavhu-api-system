import { Column, Entity, PrimaryColumn } from 'typeorm';

/** A file kept as audit evidence (F38), with its SHA-256 so later tampering is detectable. */
@Entity({ name: 'cbz_evidence', schema: 'mavhu' })
export class CbzEvidence {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ name: 'bank_id', type: 'int' })
  bankId: number;

  @Column({ name: 'entity_code', type: 'varchar', length: 20, nullable: true })
  entityCode: string | null;

  @Column({ name: 'target_type', type: 'varchar', length: 40 })
  targetType: string;

  @Column({ name: 'target_id', type: 'varchar', length: 60, nullable: true })
  targetId: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 120 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes: number;

  @Column({ type: 'varchar', length: 64 })
  sha256: string;

  @Column({ type: 'bytea', select: false })
  content: Buffer;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ name: 'uploaded_by', type: 'varchar', length: 255 })
  uploadedBy: string;

  @Column({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt: Date;
}
