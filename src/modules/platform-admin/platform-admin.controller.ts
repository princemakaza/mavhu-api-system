import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRequest, MavhuAdminGuard } from '../../common/auth/mavhu-admin.guard';
import {
  AdminCreateBankDto,
  AdminCreateMemberDto,
  AdminUpdateBankDto,
  AdminUpdateMemberDto,
  CreateEntityDto,
  CreateTeamMemberDto,
  ResetPasswordDto,
  SetPeriodDto,
  UpdateTeamMemberDto,
} from './dto/admin.dto';
import { PlatformAdminService } from './platform-admin.service';

const optionalInt = new ParseIntPipe({ optional: true });

@ApiTags('MAvHU admin console')
@ApiBearerAuth()
@UseGuards(MavhuAdminGuard)
@Controller({ path: 'admin', version: '1' })
export class PlatformAdminController {
  constructor(private readonly admin: PlatformAdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform totals and per-bank KPIs' })
  overview() { return this.admin.overview(); }

  // ── Banks ─────────────────────────────────────────────────────────────────
  @Get('banks')
  @ApiOperation({ summary: 'All client banks with their KPIs' })
  banks() { return this.admin.bankStats(); }

  @Get('banks/:id')
  @ApiOperation({ summary: 'A bank with its subsidiaries and departments' })
  bank(@Param('id', ParseIntPipe) id: number) { return this.admin.bankDetail(id); }

  @Post('banks')
  @ApiOperation({ summary: 'Onboard a bank (optionally with its first subsidiary and bank admin)' })
  createBank(@Req() req: AdminRequest, @Body() dto: AdminCreateBankDto) { return this.admin.createBank(req.admin, dto); }

  @Patch('banks/:id')
  @ApiOperation({ summary: 'Update a bank: profile, status (onboarding/active/suspended), licensed modules' })
  updateBank(@Req() req: AdminRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: AdminUpdateBankDto) {
    return this.admin.updateBank(req.admin, id, dto);
  }

  @Post('banks/:id/entities')
  @ApiOperation({ summary: 'Add a subsidiary to a bank' })
  addEntity(@Req() req: AdminRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: CreateEntityDto) {
    return this.admin.addEntity(req.admin, id, dto);
  }

  // ── Bank users & roles ────────────────────────────────────────────────────
  @Get('members')
  @ApiOperation({ summary: 'Bank portal users across all banks (filter with ?bankId=)' })
  members(@Query('bankId', optionalInt) bankId?: number) { return this.admin.listMembers(bankId); }

  @Post('members')
  @ApiOperation({ summary: 'Create a bank portal user with a role' })
  createMember(@Req() req: AdminRequest, @Body() dto: AdminCreateMemberDto) { return this.admin.createMember(req.admin, dto); }

  @Patch('members/:id')
  @ApiOperation({ summary: 'Assign a role, move subsidiary/department, or (de)activate a bank user' })
  updateMember(@Req() req: AdminRequest, @Param('id') id: string, @Body() dto: AdminUpdateMemberDto) {
    return this.admin.updateMember(req.admin, id, dto);
  }

  @Post('members/:id/reset-password')
  @ApiOperation({ summary: 'Set a new password for a bank user' })
  resetPassword(@Req() req: AdminRequest, @Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.admin.resetMemberPassword(req.admin, id, dto.password);
  }

  // ── MAvHU team ────────────────────────────────────────────────────────────
  @Get('team')
  @ApiOperation({ summary: 'MAvHU platform staff and their roles' })
  team() { return this.admin.listTeam(); }

  @Post('team')
  @ApiOperation({ summary: 'Add a MAvHU team member (MAVHU_ADMIN and/or AUDITOR)' })
  createTeamMember(@Req() req: AdminRequest, @Body() dto: CreateTeamMemberDto) { return this.admin.createTeamMember(req.admin, dto); }

  @Patch('team/:id')
  @ApiOperation({ summary: 'Change a MAvHU team member\'s roles or (de)activate them' })
  updateTeamMember(@Req() req: AdminRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeamMemberDto) {
    return this.admin.updateTeamMember(req.admin, id, dto);
  }

  // ── Reporting periods ─────────────────────────────────────────────────────
  @Get('periods')
  @ApiOperation({ summary: 'Reporting periods per bank (filter with ?bankId=)' })
  periods(@Query('bankId', optionalInt) bankId?: number) { return this.admin.listPeriods(bankId); }

  @Post('periods')
  @ApiOperation({ summary: 'Lock or reopen a bank\'s reporting period (RFP F19/F38 assurance)' })
  setPeriod(@Req() req: AdminRequest, @Body() dto: SetPeriodDto) { return this.admin.setPeriod(req.admin, dto); }

  // ── Audit ─────────────────────────────────────────────────────────────────
  @Get('audit')
  @ApiOperation({ summary: 'Cross-bank audit trail, newest first (filter with ?bankId=, cap with ?limit=)' })
  audit(@Query('bankId', optionalInt) bankId?: number, @Query('limit', new DefaultValuePipe(300), ParseIntPipe) limit?: number) {
    return this.admin.listAudit(bankId, limit);
  }
}
