import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AgriGuard, AgriRequest } from './agri.guard';
import { AgriService } from './agri.service';

@ApiTags('Agri MRV portal')
@ApiBearerAuth()
@ApiQuery({ name: 'customerId', required: false, description: 'MAvHU staff only: which farm to view' })
@UseGuards(AgriGuard)
@Controller({ path: 'agri', version: '1' })
export class AgriController {
  constructor(private readonly agri: AgriService) {}

  @Get('me')
  @ApiOperation({ summary: 'The signed-in farm user, their farm and the banks that finance it' })
  me(@Req() req: AgriRequest) { return this.agri.me(req.agri); }

  @Get('estates')
  @ApiOperation({ summary: 'Estates with latest satellite NDVI, 12-month change and carbon stock' })
  estates(@Req() req: AgriRequest) { return this.agri.estates(req.agri); }

  @Get('satellite')
  @ApiOperation({ summary: 'Monthly satellite NDVI / carbon stock series (optionally one estate)' })
  satellite(@Req() req: AgriRequest, @Query('estateId') estateId?: string) {
    return this.agri.satellite(req.agri, estateId ? Number(estateId) : undefined);
  }

  @Get('crop-cycles')
  @ApiOperation({ summary: 'Crop cycles' })
  cropCycles(@Req() req: AgriRequest) { return this.agri.cropCycles(req.agri); }

  @Post('crop-cycles')
  @ApiOperation({ summary: 'Record a crop cycle (contributors and approvers)' })
  addCropCycle(@Req() req: AgriRequest, @Body() body: { estateId: number; name: string; startDate: string; endDate: string }) {
    return this.agri.addCropCycle(req.agri, body);
  }

  @Get('emission-factors')
  @ApiOperation({ summary: 'Emission factors available for farm activity data' })
  emissionFactors() { return this.agri.emissionFactors(); }

  @Get('emissions')
  @ApiOperation({ summary: 'Farm emissions accounting entries' })
  emissions(@Req() req: AgriRequest) { return this.agri.emissions(req.agri); }

  @Post('emissions')
  @ApiOperation({ summary: 'Submit farm activity data; tCO2e is calculated from the factor' })
  addEmission(@Req() req: AgriRequest, @Body() body: any) { return this.agri.addEmission(req.agri, body); }

  @Patch('emissions/:id/approve')
  @ApiOperation({ summary: 'Approve an entry (ESG approvers; never your own)' })
  approve(@Req() req: AgriRequest, @Param('id', ParseIntPipe) id: number) { return this.agri.approveEmission(req.agri, id); }

  @Get('verifications')
  @ApiOperation({ summary: 'Field verification visits (ground truth)' })
  verifications(@Req() req: AgriRequest) { return this.agri.verifications(req.agri); }

  @Post('verifications')
  @ApiOperation({ summary: 'Record a field verification visit' })
  addVerification(@Req() req: AgriRequest, @Body() body: any) { return this.agri.addVerification(req.agri, body); }

  @Patch('verifications/:id')
  @ApiOperation({ summary: 'Confirm or dispute a visit (ESG approvers)' })
  reviewVerification(@Req() req: AgriRequest, @Param('id', ParseIntPipe) id: number, @Body() body: { status: string }) {
    return this.agri.reviewVerification(req.agri, id, body?.status);
  }
}
