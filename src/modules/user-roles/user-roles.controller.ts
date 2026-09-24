import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountResponseDto, DeleteResponseDto, ExistsResponseDto } from '../../common/dto/count-response.dto';
import { IncludeDeletedQueryDto } from '../../common/dto/include-deleted-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/swagger/api-paginated-response.decorator';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRole } from './entities/user-role.entity';
import { UserRolesService } from './user-roles.service';

@ApiTags('User Roles')
@Controller({ path: 'user-roles', version: '1' })
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Post()
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiCreatedResponse({ type: UserRole })
  create(@Body() dto: CreateUserRoleDto): Promise<UserRole> {
    return this.userRolesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user-role assignments (paginated, sortable, filterable)' })
  @ApiPaginatedResponse(UserRole)
  findAll(@Query() query: PaginationQueryDto) {
    return this.userRolesService.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count user-role assignments' })
  @ApiOkResponse({ type: CountResponseDto })
  async count(@Query() query: IncludeDeletedQueryDto): Promise<CountResponseDto> {
    return new CountResponseDto(await this.userRolesService.count(query.includeDeleted));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user-role assignment by id' })
  @ApiOkResponse({ type: UserRole })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserRole> {
    return this.userRolesService.findOne(id);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check whether a user-role assignment exists' })
  @ApiOkResponse({ type: ExistsResponseDto })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<ExistsResponseDto> {
    return new ExistsResponseDto(await this.userRolesService.exists(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a user-role assignment' })
  @ApiOkResponse({ type: UserRole })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserRoleDto): Promise<UserRole> {
    return this.userRolesService.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace a user-role assignment' })
  @ApiOkResponse({ type: UserRole })
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateUserRoleDto): Promise<UserRole> {
    return this.userRolesService.replace(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore (not supported — user-role assignments have no soft-delete flag)' })
  @ApiOkResponse({ type: UserRole })
  restore(@Param('id', ParseIntPipe) id: number): Promise<UserRole> {
    return this.userRolesService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a user-role assignment' })
  @ApiOkResponse({ type: DeleteResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteResponseDto> {
    const result = await this.userRolesService.remove(id);
    return new DeleteResponseDto(result.id, result.deleted, result.softDeleted);
  }
}
