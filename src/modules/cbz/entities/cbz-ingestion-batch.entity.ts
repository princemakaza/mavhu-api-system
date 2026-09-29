import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cbz_ingestion_batches', schema: 'mavhu' })
export class CbzIngestionBatch {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 100 })
  channel: string;

  @Column({ type: 'varchar', length: 20 })
  subsidiary: string;

  @Column({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt: Date;

  @Column({ name: 'records_processed', type: 'int', default: 0 })
  recordsProcessed: number;

  @Column({ name: 'validation_status', type: 'varchar', length: 20 })
  validationStatus: string;

  @Column({ name: 'error_details', type: 'text', default: '' })
  errorDetails: string;

  @Column({ name: 'notification_sent', type: 'boolean', default: false })
  notificationSent: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
