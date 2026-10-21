import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { AuditTrailService } from './audit-trail.service';
import { CallerContext } from './cbz.service';
import { CbzEvidence } from './entities/cbz-evidence.entity';
import { assertCan, assertEntityAccess } from './role-policy';

export const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'xlsx', 'xls', 'csv', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg', 'json', 'geojson', 'pptx'];
export const EVIDENCE_TARGETS = ['EmissionRecord', 'Counterparty', 'InsurancePolicy', 'RiskEntry', 'Incident', 'Register', 'Disclosure', 'Period', 'Other'];

/** The ESG evidence repository (F38): source documents tied to the records they support. */
@Injectable()
export class EvidenceService {
  constructor(
    @InjectRepository(CbzEvidence) private readonly evidence: Repository<CbzEvidence>,
    private readonly auditTrail: AuditTrailService,
    private readonly dataSource: DataSource,
  ) {}

  list(caller: CallerContext, filter: { targetType?: string; targetId?: string }) {
    return this.evidence.find({
      where: {
        bankId: caller.scope.bankId,
        ...(filter.targetType ? { targetType: filter.targetType } : {}),
        ...(filter.targetId ? { targetId: filter.targetId } : {}),
      },
      order: { uploadedAt: 'DESC' },
    });
  }

  async upload(
    caller: CallerContext,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    meta: { targetType?: string; targetId?: string; entityCode?: string; description?: string },
  ) {
    assertCan(caller, 'submit-data', 'upload evidence');
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Evidence must be one of: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }
    const targetType = meta.targetType || 'Other';
    if (!EVIDENCE_TARGETS.includes(targetType)) throw new BadRequestException(`targetType must be one of: ${EVIDENCE_TARGETS.join(', ')}`);
    const entityCode = meta.entityCode?.trim() || null;
    if (entityCode && !caller.scope.codes.includes(entityCode)) throw new BadRequestException(`${entityCode} is not one of this bank's subsidiaries`);
    assertEntityAccess(caller, entityCode ?? (caller.role === 'contributor' || caller.role === 'customer' ? caller.entityCode : null));

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    return this.dataSource.transaction(async (m) => {
      const row = m.create(CbzEvidence, {
        id: randomUUID(),
        bankId: caller.scope.bankId,
        entityCode: entityCode ?? (caller.role === 'contributor' || caller.role === 'customer' ? caller.entityCode : null),
        targetType,
        targetId: meta.targetId?.trim() || null,
        fileName: file.originalname.slice(0, 255),
        mimeType: (file.mimetype || 'application/octet-stream').slice(0, 120),
        sizeBytes: file.size,
        sha256,
        content: file.buffer,
        description: (meta.description ?? '').slice(0, 2000),
        uploadedBy: caller.actorName,
        uploadedAt: new Date(),
      });
      await m.save(CbzEvidence, row);
      await this.auditTrail.record({
        bankId: caller.scope.bankId, actor: caller.actorName, action: 'UPLOAD', entityCode: row.entityCode ?? 'GROUP',
        targetType: 'Evidence', targetId: row.id,
        detail: `Attached ${row.fileName} (${Math.ceil(row.sizeBytes / 1024)} KB, sha256 ${sha256.slice(0, 12)}…) to ${targetType}${row.targetId ? ` ${row.targetId}` : ''}`,
      }, m);
      const { content: _, ...meta2 } = row;
      return meta2;
    });
  }

  /** Returns the file and whether its content still matches the hash taken at upload. */
  async download(caller: CallerContext, id: string) {
    const row = await this.evidence.createQueryBuilder('e').addSelect('e.content').where('e.id = :id AND e.bank_id = :bankId', { id, bankId: caller.scope.bankId }).getOne();
    if (!row) throw new NotFoundException(`Evidence ${id} not found`);
    const intact = createHash('sha256').update(row.content).digest('hex') === row.sha256;
    return { row, intact };
  }
}
