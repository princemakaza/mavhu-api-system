import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountResponseDto, DeleteResponseDto, ExistsResponseDto } from '../../common/dto/count-response.dto';
import { IncludeDeletedQueryDto } from '../../common/dto/include-deleted-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/swagger/api-paginated-response.decorator';
import { CreateRolePermissionDto } from './dto/create-role-permission.dto';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import { RolePermission } from './entities/role-permission.entity';
import { RolePermissionsService } from './role-permissions.service';

@ApiTags('Role Permissions')
@Controller({ path: 'role-permissions', version: '1' })
export class RolePermissionsController {
  constructor(private readonly rolePermissionsService: RolePermissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Grant an API permission to a role' })
  @ApiCreatedResponse({ type: RolePermission })
  create(@Body() dto: CreateRolePermissionDto): Promise<RolePermission> {
    return this.rolePermissionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List role permissions (paginated, sortable, filterable)' })
  @ApiPaginatedResponse(RolePermission)
  findAll(@Query() query: PaginationQueryDto) {
    return this.rolePermissionsService.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count role permissions' })
  @ApiOkResponse({ type: CountResponseDto })
  async count(@Query() query: IncludeDeletedQueryDto): Promise<CountResponseDto> {
    return new CountResponseDto(await this.rolePermissionsService.count(query.includeDeleted));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role permission by id' })
  @ApiOkResponse({ type: RolePermission })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<RolePermission> {
    return this.rolePermissionsService.findOne(id);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check whether a role permission exists' })
  @ApiOkResponse({ type: ExistsResponseDto })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<ExistsResponseDto> {
    return new ExistsResponseDto(await this.rolePermissionsService.exists(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a role permission' })
  @ApiOkResponse({ type: RolePermission })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRolePermissionDto): Promise<RolePermission> {
    return this.rolePermissionsService.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace a role permission' })
  @ApiOkResponse({ type: RolePermission })
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateRolePermissionDto): Promise<RolePermission> {
    return this.rolePermissionsService.replace(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore (not supported — role permissions have no soft-delete flag)' })
  @ApiOkResponse({ type: RolePermission })
  restore(@Param('id', ParseIntPipe) id: number): Promise<RolePermission> {
    return this.rolePermissionsService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a role permission' })
  @ApiOkResponse({ type: DeleteResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteResponseDto> {
    const result = await this.rolePermissionsService.remove(id);
    return new DeleteResponseDto(result.id, result.deleted, result.softDeleted);
  }
}
