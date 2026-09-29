import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CbzService } from './cbz.service';

@ApiTags('CBZ ESG')
@Controller({ path: 'cbz', version: '1' })
export class CbzController {
  constructor(private readonly cbz: CbzService) {}

  // ── Entities ──────────────────────────────────────────────────────────────
  @Get('entities')
  @ApiOperation({ summary: 'List CBZ subsidiaries' })
  getEntities() { return this.cbz.getEntities(); }

  // ── Departments ───────────────────────────────────────────────────────────
  @Get('departments')
  @ApiOperation({ summary: 'List CBZ departments' })
  getDepartments() { return this.cbz.getDepartments(); }

  @Post('departments')
  @ApiOperation({ summary: 'Add a department' })
  addDepartment(@Body() body: Record<string, unknown>) { return this.cbz.addDepartment(body as any); }

  // ── Members ───────────────────────────────────────────────────────────────
  @Get('members')
  @ApiOperation({ summary: 'List CBZ members (no password)' })
  getMembers() { return this.cbz.getMembers(); }

  @Post('members')
  @ApiOperation({ summary: 'Add a member' })
  addMember(@Body() body: Record<string, unknown>) { return this.cbz.addMember(body as any); }

  @Post('auth/login')
  @ApiOperation({ summary: 'CBZ portal login' })
  login(@Body() body: { email: string; password: string }) {
    return this.cbz.login(body.email, body.password);
  }

  // ── Counterparties ────────────────────────────────────────────────────────
  @Get('counterparties')
  @ApiOperation({ summary: 'List counterparties' })
  getCounterparties() { return this.cbz.getCounterparties(); }

  @Post('counterparties')
  @ApiOperation({ summary: 'Add a counterparty' })
  addCounterparty(@Body() body: Record<string, unknown>) { return this.cbz.addCounterparty(body as any); }

  // ── Financed positions ────────────────────────────────────────────────────
  @Get('financed-positions')
  @ApiOperation({ summary: 'List financed positions' })
  getFinancedPositions() { return this.cbz.getFinancedPositions(); }

  @Post('financed-positions')
  @ApiOperation({ summary: 'Add a financed position' })
  addFinancedPosition(@Body() body: Record<string, unknown>) { return this.cbz.addFinancedPosition(body as any); }

  // ── ESG Emissions ─────────────────────────────────────────────────────────
  @Get('emissions')
  @ApiOperation({ summary: 'List ESG emissions records' })
  getEmissions() { return this.cbz.getEmissions(); }

  @Post('emissions')
  @ApiOperation({ summary: 'Submit a new emission record' })
  addEmission(@Body() body: Record<string, unknown>) { return this.cbz.addEmission(body as any); }

  @Patch('emissions/:id/advance')
  @ApiOperation({ summary: 'Advance emission record workflow status' })
  advanceEmission(@Param('id') id: string, @Body() body: { actorId?: string }) {
    return this.cbz.advanceEmissionStatus(id, body.actorId ?? 'system');
  }

  // ── Insurance ─────────────────────────────────────────────────────────────
  @Get('insurance')
  @ApiOperation({ summary: 'List insurance policies' })
  getInsurance() { return this.cbz.getInsurance(); }

  @Post('insurance')
  @ApiOperation({ summary: 'Add an insurance policy' })
  addInsurance(@Body() body: Record<string, unknown>) { return this.cbz.addInsurance(body as any); }

  // ── Financial inclusion ───────────────────────────────────────────────────
  @Get('financial-inclusion')
  @ApiOperation({ summary: 'List financial inclusion records' })
  getFinancialInclusion() { return this.cbz.getFinancialInclusion(); }

  // ── Workforce ─────────────────────────────────────────────────────────────
  @Get('workforce')
  @ApiOperation({ summary: 'List workforce records' })
  getWorkforce() { return this.cbz.getWorkforce(); }

  // ── Incidents ─────────────────────────────────────────────────────────────
  @Get('incidents')
  @ApiOperation({ summary: 'List ESG incidents' })
  getIncidents() { return this.cbz.getIncidents(); }

  @Post('incidents')
  @ApiOperation({ summary: 'Report a new incident' })
  addIncident(@Body() body: Record<string, unknown>) { return this.cbz.addIncident(body as any); }

  // ── Risks ─────────────────────────────────────────────────────────────────
  @Get('risks')
  @ApiOperation({ summary: 'List climate risk entries' })
  getRisks() { return this.cbz.getRisks(); }

  @Post('risks')
  @ApiOperation({ summary: 'Add a risk entry' })
  addRisk(@Body() body: Record<string, unknown>) { return this.cbz.addRisk(body as any); }

  // ── Geospatial ────────────────────────────────────────────────────────────
  @Get('geospatial')
  @ApiOperation({ summary: 'List geospatial/NDVI records' })
  getGeospatial() { return this.cbz.getGeospatial(); }

  // ── Ingestion ─────────────────────────────────────────────────────────────
  @Get('ingestion')
  @ApiOperation({ summary: 'List data ingestion batches' })
  getIngestion() { return this.cbz.getIngestion(); }

  @Post('ingestion')
  @ApiOperation({ summary: 'Log a new ingestion batch' })
  addIngestionBatch(@Body() body: Record<string, unknown>) { return this.cbz.addIngestionBatch(body as any); }

  // ── Audit log ─────────────────────────────────────────────────────────────
  @Get('audit')
  @ApiOperation({ summary: 'List audit log entries' })
  getAudit() { return this.cbz.getAudit(); }

  @Post('audit')
  @ApiOperation({ summary: 'Append an audit entry' })
  appendAudit(@Body() body: Record<string, unknown>) { return this.cbz.appendAudit(body as any); }
}
