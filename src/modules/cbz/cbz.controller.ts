import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CbzService, ScopeInput } from './cbz.service';
import { DisclosuresService } from './disclosures.service';
import { EVIDENCE_TARGETS, EvidenceService, MAX_EVIDENCE_BYTES } from './evidence.service';
import { CbzImportService } from './import/cbz-import.service';
import { RegistersService } from './registers/registers.service';
import { Scope } from './scope.decorator';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
type UploadedFileLike = { buffer: Buffer; originalname: string; mimetype: string; size: number };

/**
 * Bank portal API. Reads need any signed-in bank user (or MAvHU staff with ?bankId=); every
 * write is checked against the role policy on the server and recorded in the audit trail.
 */
@ApiTags('Bank ESG')
@ApiBearerAuth()
@ApiQuery({ name: 'bankId', required: false, description: 'MAvHU staff only: which bank to read (admins also write)' })
@Controller({ path: 'cbz', version: '1' })
export class CbzController {
  constructor(
    private readonly cbz: CbzService,
    private readonly importer: CbzImportService,
    private readonly registers: RegistersService,
    private readonly evidence: EvidenceService,
    private readonly disclosures: DisclosuresService,
  ) {}

  private caller(s: ScopeInput) {
    return this.cbz.resolveCaller(s);
  }

  // ── Session ───────────────────────────────────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'The signed-in user, their role and what it allows' })
  async me(@Scope() s: ScopeInput) { return this.cbz.me(await this.caller(s)); }

  @Post('auth/login')
  @ApiOperation({ summary: 'Bank portal login' })
  login(@Body() body: { email: string; password: string }) {
    return this.cbz.login(body.email, body.password);
  }

  // ── Bulk import (Excel / CSV) ─────────────────────────────────────────────
  @Post('import')
  @ApiOperation({
    summary: 'Bulk import an .xlsx workbook or .csv file in the ESG dataset layout',
    description:
      'Sheets are recognised by their column headers (title row 1, headers row 2). With dryRun=true nothing is saved and ' +
      'every rejected row is returned with a reason code; without it, valid rows are saved in one transaction and each ' +
      'sheet is logged as an ingestion batch.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' }, period: { type: 'string', example: '2026-Q3', description: 'Used when a row has no period' } },
    },
  })
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  async importFile(
    @Scope() s: ScopeInput,
    @UploadedFile() file: UploadedFileLike | undefined,
    @Query('dryRun') dryRun?: string,
    @Body('period') period?: string,
  ) {
    if (!file) throw new BadRequestException('Attach the file in a form field named "file"');
    return this.importer.run(s, file, dryRun === 'true' || dryRun === '1', period);
  }

  @Get('import/template')
  @ApiOperation({ summary: 'Download the bank\'s Excel import template' })
  async importTemplate(@Scope() s: ScopeInput) {
    const { buffer, fileName } = await this.importer.template(s);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get('import/datasets')
  @ApiOperation({ summary: 'Sheets and columns the importer accepts' })
  importDatasets() { return this.importer.describe(); }

  // ── Bank, periods, entities ───────────────────────────────────────────────
  @Get('bank')
  @ApiOperation({ summary: 'The bank this request is scoped to (name, status, licensed modules)' })
  async getBank(@Scope() s: ScopeInput) { return this.cbz.getBank(await this.cbz.scope(s)); }

  @Get('periods')
  @ApiOperation({ summary: 'Reporting periods and whether they are locked' })
  async getPeriods(@Scope() s: ScopeInput) { return this.cbz.getPeriods(await this.cbz.scope(s)); }

  @Get('entities')
  @ApiOperation({ summary: 'List the bank\'s subsidiaries' })
  async getEntities(@Scope() s: ScopeInput) { return this.cbz.getEntities(await this.cbz.scope(s)); }

  // ── Departments & members ─────────────────────────────────────────────────
  @Get('departments')
  @ApiOperation({ summary: 'List departments' })
  async getDepartments(@Scope() s: ScopeInput) { return this.cbz.getDepartments(await this.cbz.scope(s)); }

  @Post('departments')
  @ApiOperation({ summary: 'Add a department (bank admins)' })
  async addDepartment(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addDepartment(await this.caller(s), body as any);
  }

  @Get('members')
  @ApiOperation({ summary: 'List members (no password)' })
  async getMembers(@Scope() s: ScopeInput) { return this.cbz.getMembers(await this.cbz.scope(s)); }

  @Post('members')
  @ApiOperation({ summary: 'Add a member (bank admins)' })
  async addMember(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addMember(await this.caller(s), body as any);
  }

  // ── Counterparties & positions ────────────────────────────────────────────
  @Get('counterparties')
  @ApiOperation({ summary: 'List counterparties (with taxonomy tags and MRV customer link)' })
  async getCounterparties(@Scope() s: ScopeInput) { return this.cbz.getCounterparties(await this.cbz.scope(s)); }

  @Post('counterparties')
  @ApiOperation({ summary: 'Add a counterparty' })
  async addCounterparty(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addCounterparty(await this.caller(s), body as any);
  }

  @Patch('counterparties/:id/taxonomy')
  @ApiOperation({ summary: 'Tag an instrument against a sustainable-finance taxonomy (F22/F33)' })
  async tagCounterparty(@Scope() s: ScopeInput, @Param('id') id: string, @Body() body: { taxonomy?: string | null; taxonomyCategory?: string | null; taxonomyStatus?: string | null }) {
    return this.cbz.tagCounterparty(await this.caller(s), id, body);
  }

  @Get('financed-positions')
  @ApiOperation({ summary: 'List financed positions' })
  async getFinancedPositions(@Scope() s: ScopeInput) { return this.cbz.getFinancedPositions(await this.cbz.scope(s)); }

  @Post('financed-positions')
  @ApiOperation({ summary: 'Add a financed position' })
  async addFinancedPosition(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addFinancedPosition(await this.caller(s), body as any);
  }

  @Get('mrv')
  @ApiOperation({ summary: 'MRV-linked borrowers: satellite NDVI trend, carbon stock and field verification (A3-A6)' })
  async getMrv(@Scope() s: ScopeInput) { return this.cbz.getMrv(await this.cbz.scope(s)); }

  // ── Emissions workflow ────────────────────────────────────────────────────
  @Get('emissions')
  @ApiOperation({ summary: 'List ESG emissions records' })
  async getEmissions(@Scope() s: ScopeInput) { return this.cbz.getEmissions(await this.cbz.scope(s)); }

  @Post('emissions')
  @ApiOperation({ summary: 'Submit a new emission record as draft (rejected if its period is locked)' })
  async addEmission(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addEmission(await this.caller(s), body as any);
  }

  @Patch('emissions/:id/advance')
  @ApiOperation({ summary: 'Advance a record: draft → in review → approved → locked (segregation of duties enforced)' })
  async advanceEmission(@Scope() s: ScopeInput, @Param('id') id: string) {
    return this.cbz.advanceEmissionStatus(await this.caller(s), id);
  }

  @Patch('emissions/:id/reject')
  @ApiOperation({ summary: 'Send a record in review back to draft with a reason' })
  async rejectEmission(@Scope() s: ScopeInput, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.cbz.rejectEmission(await this.caller(s), id, body?.reason);
  }

  // ── Insurance, inclusion, workforce ───────────────────────────────────────
  @Get('insurance')
  @ApiOperation({ summary: 'List insurance policies' })
  async getInsurance(@Scope() s: ScopeInput) { return this.cbz.getInsurance(await this.cbz.scope(s)); }

  @Post('insurance')
  @ApiOperation({ summary: 'Add an insurance policy' })
  async addInsurance(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addInsurance(await this.caller(s), body as any);
  }

  @Get('financial-inclusion')
  @ApiOperation({ summary: 'List financial inclusion records' })
  async getFinancialInclusion(@Scope() s: ScopeInput) { return this.cbz.getFinancialInclusion(await this.cbz.scope(s)); }

  @Get('workforce')
  @ApiOperation({ summary: 'List workforce records' })
  async getWorkforce(@Scope() s: ScopeInput) { return this.cbz.getWorkforce(await this.cbz.scope(s)); }

  // ── Incidents & risks ─────────────────────────────────────────────────────
  @Get('incidents')
  @ApiOperation({ summary: 'List ESG incidents' })
  async getIncidents(@Scope() s: ScopeInput) { return this.cbz.getIncidents(await this.cbz.scope(s)); }

  @Post('incidents')
  @ApiOperation({ summary: 'Report a new incident' })
  async addIncident(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addIncident(await this.caller(s), body as any);
  }

  @Patch('incidents/:id')
  @ApiOperation({ summary: 'Progress an incident to closure' })
  async updateIncident(@Scope() s: ScopeInput, @Param('id') id: string, @Body() body: { status?: string; correctiveAction?: string; closureDate?: string | null }) {
    return this.cbz.updateIncident(await this.caller(s), id, body);
  }

  @Get('risks')
  @ApiOperation({ summary: 'List climate and ESG risk register entries' })
  async getRisks(@Scope() s: ScopeInput) { return this.cbz.getRisks(await this.cbz.scope(s)); }

  @Post('risks')
  @ApiOperation({ summary: 'Add a risk entry' })
  async addRisk(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addRisk(await this.caller(s), body as any);
  }

  @Patch('risks/:id')
  @ApiOperation({ summary: 'Re-rate or progress a risk (moves it on the heat map)' })
  async updateRisk(@Scope() s: ScopeInput, @Param('id') id: string, @Body() body: { likelihood?: number; impact?: number; status?: string; owner?: string }) {
    return this.cbz.updateRisk(await this.caller(s), id, body);
  }

  // ── Geospatial & ingestion ────────────────────────────────────────────────
  @Get('geospatial')
  @ApiOperation({ summary: 'List geospatial/NDVI records' })
  async getGeospatial(@Scope() s: ScopeInput) { return this.cbz.getGeospatial(await this.cbz.scope(s)); }

  @Get('ingestion')
  @ApiOperation({ summary: 'List data ingestion batches' })
  async getIngestion(@Scope() s: ScopeInput) { return this.cbz.getIngestion(await this.cbz.scope(s)); }

  @Post('ingestion')
  @ApiOperation({ summary: 'Log a new ingestion batch' })
  async addIngestionBatch(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addIngestionBatch(await this.caller(s), body as any);
  }

  // ── Audit trail ───────────────────────────────────────────────────────────
  @Get('audit')
  @ApiOperation({ summary: 'Audit trail entries (hash-chained, with before/after values), newest first' })
  async getAudit(@Scope() s: ScopeInput) { return this.cbz.getAudit(await this.cbz.scope(s)); }

  @Get('audit/verify')
  @ApiOperation({ summary: 'Recompute the hash chain and report any entry changed after it was written' })
  async verifyAudit(@Scope() s: ScopeInput) { return this.cbz.verifyAudit(await this.cbz.scope(s)); }

  @Post('audit')
  @ApiOperation({ summary: 'Add a note to the audit trail (actor is always the signed-in user)' })
  async appendAudit(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.appendAudit(await this.caller(s), body as any);
  }

  // ── Registers ─────────────────────────────────────────────────────────────
  @Get('registers')
  @ApiOperation({ summary: 'Register definitions: fields, write permission, RFP reference' })
  registerDefinitions() { return this.registers.definitions(); }

  @Get('registers/:register')
  @ApiOperation({ summary: 'Entries of one register (targets, risk-appetite, suppliers, …)' })
  async listRegister(@Scope() s: ScopeInput, @Param('register') register: string) {
    return this.registers.list(await this.caller(s), register);
  }

  @Post('registers/:register')
  @ApiOperation({ summary: 'Add an entry: { entityCode?, data: {...} }' })
  async createRegisterItem(@Scope() s: ScopeInput, @Param('register') register: string, @Body() body: { entityCode?: string | null; data?: Record<string, unknown> }) {
    return this.registers.create(await this.caller(s), register, body);
  }

  @Patch('registers/:register/:id')
  @ApiOperation({ summary: 'Change an entry (partial data)' })
  async updateRegisterItem(@Scope() s: ScopeInput, @Param('register') register: string, @Param('id') id: string, @Body() body: { entityCode?: string | null; data?: Record<string, unknown> }) {
    return this.registers.update(await this.caller(s), register, id, body);
  }

  @Delete('registers/:register/:id')
  @ApiOperation({ summary: 'Remove an entry (content is kept in the audit trail)' })
  async removeRegisterItem(@Scope() s: ScopeInput, @Param('register') register: string, @Param('id') id: string) {
    return this.registers.remove(await this.caller(s), register, id);
  }

  // ── Evidence repository ───────────────────────────────────────────────────
  @Get('evidence')
  @ApiOperation({ summary: 'Evidence files (filter by targetType / targetId)' })
  async listEvidence(@Scope() s: ScopeInput, @Query('targetType') targetType?: string, @Query('targetId') targetId?: string) {
    return this.evidence.list(await this.caller(s), { targetType, targetId });
  }

  @Post('evidence')
  @ApiOperation({ summary: 'Attach an evidence file to a record', description: `targetType: ${EVIDENCE_TARGETS.join(', ')}` })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        targetType: { type: 'string', enum: EVIDENCE_TARGETS },
        targetId: { type: 'string' },
        entityCode: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_EVIDENCE_BYTES, files: 1 } }))
  async uploadEvidence(
    @Scope() s: ScopeInput,
    @UploadedFile() file: UploadedFileLike | undefined,
    @Body() body: { targetType?: string; targetId?: string; entityCode?: string; description?: string },
  ) {
    if (!file) throw new BadRequestException('Attach the file in a form field named "file"');
    return this.evidence.upload(await this.caller(s), file, body);
  }

  @Get('evidence/:id/download')
  @ApiOperation({ summary: 'Download an evidence file; X-Content-Intact says whether it still matches its SHA-256' })
  async downloadEvidence(@Scope() s: ScopeInput, @Param('id') id: string) {
    const { row, intact } = await this.evidence.download(await this.caller(s), id);
    return new StreamableFile(row.content, {
      type: row.mimeType,
      disposition: `attachment; filename="${row.fileName.replace(/"/g, '')}"`,
    }) as StreamableFile & { intact: boolean };
  }

  // ── Disclosures ───────────────────────────────────────────────────────────
  @Get('disclosures')
  @ApiOperation({ summary: 'Published disclosure versions' })
  async listDisclosures(@Scope() s: ScopeInput) { return this.disclosures.list(await this.caller(s)); }

  @Get('disclosures/:id')
  @ApiOperation({ summary: 'A published disclosure with its snapshot and an integrity check' })
  async getDisclosure(@Scope() s: ScopeInput, @Param('id') id: string) { return this.disclosures.get(await this.caller(s), id); }

  @Post('disclosures')
  @ApiOperation({ summary: 'Publish a framework disclosure built from approved data (immutable, versioned, hashed)' })
  async publishDisclosure(@Scope() s: ScopeInput, @Body() body: any) { return this.disclosures.publish(await this.caller(s), body); }

  @Get('disclosures/:id/export')
  @ApiOperation({ summary: 'Export a published version: format=xlsx|csv|doc|json' })
  async exportDisclosure(@Scope() s: ScopeInput, @Param('id') id: string, @Query('format') format = 'xlsx') {
    const { buffer, fileName, type } = await this.disclosures.export(await this.caller(s), id, format);
    return new StreamableFile(buffer, { type, disposition: `attachment; filename="${fileName}"` });
  }
}
