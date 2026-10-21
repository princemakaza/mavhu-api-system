import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { stableStringify } from '../../common/stable-json';
import { CbzAuditLog } from './entities/cbz-audit-log.entity';

export interface AuditInput {
  bankId: number | null;
  actor: string;
  action: string;
  entityCode?: string | null;
  targetType: string;
  targetId?: string | null;
  detail: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export interface ChainVerification {
  total: number;
  verified: number;
  intact: boolean;
  headHash: string | null;
  checkedAt: string;
  broken: Array<{ seq: string; id: string; reason: string }>;
}

const GENESIS = '0'.repeat(64);
/** pg_advisory_xact_lock key: serialises appends so two writers can never fork the chain. */
const CHAIN_LOCK = 70_418_018;

/**
 * Tamper-evident audit trail (RFP F18). Every entry stores the SHA-256 of the previous entry and
 * of its own content; the database rejects updates and deletes. Editing any row in the database
 * directly breaks the chain from that row on, which verify() reports.
 */
@Injectable()
export class AuditTrailService implements OnModuleInit {
  private readonly logger = new Logger(AuditTrailService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Rows written before the chain existed (or by SQL) are sealed once, in insertion order. */
  async onModuleInit() {
    try {
      const sealed = await this.dataSource.transaction(async (m) => {
        await m.query('SELECT pg_advisory_xact_lock($1)', [CHAIN_LOCK]);
        const repo = m.getRepository(CbzAuditLog);
        const pending = await repo.find({ where: { hash: IsNull() }, order: { seq: 'ASC' } });
        for (const row of pending) {
          // The row just before this one was sealed by the previous iteration (or long ago).
          const prevHash = await this.prevHashBefore(m, row.seq);
          const hash = AuditTrailService.hashOf(row, prevHash);
          await m.query('UPDATE mavhu.cbz_audit_log SET prev_hash = $1, hash = $2 WHERE id = $3', [prevHash, hash, row.id]);
        }
        return pending.length;
      });
      if (sealed) this.logger.log(`Sealed ${sealed} audit entries into the hash chain`);
    } catch (err) {
      this.logger.error(`Could not seal the audit chain: ${(err as Error).message}`);
    }
  }

  private async prevHashBefore(m: EntityManager, seq: string): Promise<string> {
    const rows: Array<{ hash: string | null }> = await m.query(
      'SELECT hash FROM mavhu.cbz_audit_log WHERE seq < $1 ORDER BY seq DESC LIMIT 1',
      [seq],
    );
    return rows[0]?.hash ?? GENESIS;
  }

  static hashOf(row: Pick<CbzAuditLog, 'id' | 'timestamp' | 'actor' | 'action' | 'entityCode' | 'targetType' | 'targetId' | 'detail' | 'bankId' | 'before' | 'after'>, prevHash: string): string {
    const payload = stableStringify([
      prevHash,
      row.id,
      new Date(row.timestamp).toISOString(),
      row.actor,
      row.action,
      row.entityCode ?? null,
      row.targetType,
      row.targetId ?? null,
      row.detail,
      row.bankId ?? null,
      row.before ?? null,
      row.after ?? null,
    ]);
    return createHash('sha256').update(payload).digest('hex');
  }

  /** Appends one entry. Pass the caller's transaction manager so the entry commits with the change. */
  async record(input: AuditInput, manager?: EntityManager): Promise<CbzAuditLog> {
    const run = async (m: EntityManager) => {
      await m.query('SELECT pg_advisory_xact_lock($1)', [CHAIN_LOCK]);
      const last: Array<{ hash: string | null }> = await m.query('SELECT hash FROM mavhu.cbz_audit_log ORDER BY seq DESC LIMIT 1');
      const prevHash = last[0]?.hash ?? GENESIS;
      const repo = m.getRepository(CbzAuditLog);
      const row = repo.create({
        id: randomUUID(),
        // Millisecond precision so the stored value hashes the same when read back.
        timestamp: new Date(Math.floor(Date.now())),
        actor: input.actor.slice(0, 255),
        action: input.action.slice(0, 50),
        entityCode: input.entityCode ?? null,
        targetType: input.targetType.slice(0, 30),
        targetId: input.targetId ? input.targetId.slice(0, 50) : null,
        detail: input.detail,
        bankId: input.bankId,
        before: input.before ?? null,
        after: input.after ?? null,
        prevHash,
      });
      row.hash = AuditTrailService.hashOf(row, prevHash);
      return repo.save(row);
    };
    return manager ? run(manager) : this.dataSource.transaction(run);
  }

  /** Recomputes every hash in order. Reports rows whose content or link no longer matches. */
  async verify(bankId?: number): Promise<ChainVerification> {
    const rows = await this.dataSource.getRepository(CbzAuditLog).find({ order: { seq: 'ASC' } });
    const broken: ChainVerification['broken'] = [];
    let prev = GENESIS;
    for (const row of rows) {
      const reasons: string[] = [];
      if (!row.hash) reasons.push('not sealed');
      else {
        if ((row.prevHash ?? GENESIS) !== prev) reasons.push('link to previous entry does not match');
        if (AuditTrailService.hashOf(row, row.prevHash ?? GENESIS) !== row.hash) reasons.push('content changed after it was written');
      }
      if (reasons.length && (bankId === undefined || row.bankId === bankId)) {
        broken.push({ seq: row.seq, id: row.id, reason: reasons.join('; ') });
      }
      prev = row.hash ?? prev;
    }
    const inScope = bankId === undefined ? rows : rows.filter((r) => r.bankId === bankId);
    return {
      total: inScope.length,
      verified: inScope.length - broken.length,
      intact: broken.length === 0,
      headHash: rows.length ? rows[rows.length - 1].hash : null,
      checkedAt: new Date().toISOString(),
      broken: broken.slice(0, 50),
    };
  }
}
