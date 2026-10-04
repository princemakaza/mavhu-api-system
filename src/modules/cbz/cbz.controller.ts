import {
  BadRequestException,
  Body,
  Controller,
  createParamDecorator,
  ExecutionContext,
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
import { Request } from 'express';
import { CbzService, ScopeInput } from './cbz.service';
import { CbzImportService } from './import/cbz-import.service';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** The caller's token and optional ?bankId=, which CbzService.scope() turns into a bank. */
const Scope = createParamDecorator((_: unknown, ctx: ExecutionContext): ScopeInput => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const bankId = request.query.bankId;
  return { authorization: request.headers.authorization, bankId: typeof bankId === 'string' ? bankId : undefined };
});

@ApiTags('CBZ ESG')
@ApiBearerAuth()
@ApiQuery({ name: 'bankId', required: false, description: 'MAvHU admins only: which bank to read or write' })
@Controller({ path: 'cbz', version: '1' })
export class CbzController {
  constructor(
    private readonly cbz: CbzService,
    private readonly importer: CbzImportService,
  ) {}

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
    @UploadedFile() file: { buffer: Buffer; originalname: string; size: number } | undefined,
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

  // ── Bank ──────────────────────────────────────────────────────────────────
  @Get('bank')
  @ApiOperation({ summary: 'The bank this request is scoped to (name, status, licensed modules)' })
  async getBank(@Scope() s: ScopeInput) { return this.cbz.getBank(await this.cbz.scope(s)); }

  @Get('periods')
  @ApiOperation({ summary: 'Reporting periods and whether they are locked' })
  async getPeriods(@Scope() s: ScopeInput) { return this.cbz.getPeriods(await this.cbz.scope(s)); }

  // ── Entities ──────────────────────────────────────────────────────────────
  @Get('entities')
  @ApiOperation({ summary: 'List the bank\'s subsidiaries' })
  async getEntities(@Scope() s: ScopeInput) { return this.cbz.getEntities(await this.cbz.scope(s)); }

  // ── Departments ───────────────────────────────────────────────────────────
  @Get('departments')
  @ApiOperation({ summary: 'List departments' })
  async getDepartments(@Scope() s: ScopeInput) { return this.cbz.getDepartments(await this.cbz.scope(s)); }

  @Post('departments')
  @ApiOperation({ summary: 'Add a department' })
  async addDepartment(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addDepartment(await this.cbz.scope(s), body as any);
  }

  // ── Members ───────────────────────────────────────────────────────────────
  @Get('members')
  @ApiOperation({ summary: 'List members (no password)' })
  async getMembers(@Scope() s: ScopeInput) { return this.cbz.getMembers(await this.cbz.scope(s)); }

  @Post('members')
  @ApiOperation({ summary: 'Add a member' })
  async addMember(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addMember(await this.cbz.scope(s), body as any);
  }

  @Post('auth/login')
  @ApiOperation({ summary: 'Bank portal login' })
  login(@Body() body: { email: string; password: string }) {
    return this.cbz.login(body.email, body.password);
  }

  // ── Counterparties ────────────────────────────────────────────────────────
  @Get('counterparties')
  @ApiOperation({ summary: 'List counterparties' })
  async getCounterparties(@Scope() s: ScopeInput) { return this.cbz.getCounterparties(await this.cbz.scope(s)); }

  @Post('counterparties')
  @ApiOperation({ summary: 'Add a counterparty' })
  async addCounterparty(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addCounterparty(await this.cbz.scope(s), body as any);
  }

  // ── Financed positions ────────────────────────────────────────────────────
  @Get('financed-positions')
  @ApiOperation({ summary: 'List financed positions' })
  async getFinancedPositions(@Scope() s: ScopeInput) { return this.cbz.getFinancedPositions(await this.cbz.scope(s)); }

  @Post('financed-positions')
  @ApiOperation({ summary: 'Add a financed position' })
  async addFinancedPosition(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addFinancedPosition(await this.cbz.scope(s), body as any);
  }

  // ── ESG Emissions ─────────────────────────────────────────────────────────
  @Get('emissions')
  @ApiOperation({ summary: 'List ESG emissions records' })
  async getEmissions(@Scope() s: ScopeInput) { return this.cbz.getEmissions(await this.cbz.scope(s)); }

  @Post('emissions')
  @ApiOperation({ summary: 'Submit a new emission record (rejected if its period is locked)' })
  async addEmission(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addEmission(await this.cbz.resolveCaller(s), body as any);
  }

  @Patch('emissions/:id/advance')
  @ApiOperation({ summary: 'Advance emission record workflow status (rejected if its period is locked)' })
  async advanceEmission(@Scope() s: ScopeInput, @Param('id') id: string) {
    return this.cbz.advanceEmissionStatus(await this.cbz.resolveCaller(s), id);
  }

  // ── Insurance ─────────────────────────────────────────────────────────────
  @Get('insurance')
  @ApiOperation({ summary: 'List insurance policies' })
  async getInsurance(@Scope() s: ScopeInput) { return this.cbz.getInsurance(await this.cbz.scope(s)); }

  @Post('insurance')
  @ApiOperation({ summary: 'Add an insurance policy' })
  async addInsurance(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addInsurance(await this.cbz.scope(s), body as any);
  }

  // ── Financial inclusion ───────────────────────────────────────────────────
  @Get('financial-inclusion')
  @ApiOperation({ summary: 'List financial inclusion records' })
  async getFinancialInclusion(@Scope() s: ScopeInput) { return this.cbz.getFinancialInclusion(await this.cbz.scope(s)); }

  // ── Workforce ─────────────────────────────────────────────────────────────
  @Get('workforce')
  @ApiOperation({ summary: 'List workforce records' })
  async getWorkforce(@Scope() s: ScopeInput) { return this.cbz.getWorkforce(await this.cbz.scope(s)); }

  // ── Incidents ─────────────────────────────────────────────────────────────
  @Get('incidents')
  @ApiOperation({ summary: 'List ESG incidents' })
  async getIncidents(@Scope() s: ScopeInput) { return this.cbz.getIncidents(await this.cbz.scope(s)); }

  @Post('incidents')
  @ApiOperation({ summary: 'Report a new incident' })
  async addIncident(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addIncident(await this.cbz.scope(s), body as any);
  }

  // ── Risks ─────────────────────────────────────────────────────────────────
  @Get('risks')
  @ApiOperation({ summary: 'List climate risk entries' })
  async getRisks(@Scope() s: ScopeInput) { return this.cbz.getRisks(await this.cbz.scope(s)); }

  @Post('risks')
  @ApiOperation({ summary: 'Add a risk entry' })
  async addRisk(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addRisk(await this.cbz.scope(s), body as any);
  }

  // ── Geospatial ────────────────────────────────────────────────────────────
  @Get('geospatial')
  @ApiOperation({ summary: 'List geospatial/NDVI records' })
  async getGeospatial(@Scope() s: ScopeInput) { return this.cbz.getGeospatial(await this.cbz.scope(s)); }

  // ── Ingestion ─────────────────────────────────────────────────────────────
  @Get('ingestion')
  @ApiOperation({ summary: 'List data ingestion batches' })
  async getIngestion(@Scope() s: ScopeInput) { return this.cbz.getIngestion(await this.cbz.scope(s)); }

  @Post('ingestion')
  @ApiOperation({ summary: 'Log a new ingestion batch' })
  async addIngestionBatch(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.addIngestionBatch(await this.cbz.scope(s), body as any);
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  @Get('audit')
  @ApiOperation({ summary: 'List audit log entries' })
  async getAudit(@Scope() s: ScopeInput) { return this.cbz.getAudit(await this.cbz.scope(s)); }

  @Post('audit')
  @ApiOperation({ summary: 'Append an audit entry' })
  async appendAudit(@Scope() s: ScopeInput, @Body() body: Record<string, unknown>) {
    return this.cbz.appendAudit(await this.cbz.scope(s), body as any);
  }
}
