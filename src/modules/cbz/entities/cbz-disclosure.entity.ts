import { Column, Entity, PrimaryColumn } from 'typeorm';

/** A published, immutable disclosure version (F44): only this locked snapshot is ever distributed. */
@Entity({ name: 'cbz_disclosures', schema: 'mavhu' })
export class CbzDisclosure {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ name: 'bank_id', type: 'int' })
  bankId: number;

  @Column({ type: 'varchar', length: 40 })
  framework: string;

  @Column({ type: 'varchar', length: 20 })
  period: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'jsonb' })
  snapshot: Record<string, unknown>;

  @Column({ type: 'varchar', length: 64 })
  hash: string;

  @Column({ name: 'published_by', type: 'varchar', length: 255 })
  publishedBy: string;

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt: Date;
}
