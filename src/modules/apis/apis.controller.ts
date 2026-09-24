import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountResponseDto, DeleteResponseDto, ExistsResponseDto } from '../../common/dto/count-response.dto';
import { IncludeDeletedQueryDto } from '../../common/dto/include-deleted-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/swagger/api-paginated-response.decorator';
import { ApisService } from './apis.service';
import { CreateApiDto } from './dto/create-api.dto';
import { UpdateApiDto } from './dto/update-api.dto';
import { Api } from './entities/api.entity';

@ApiTags('Apis')
@Controller({ path: 'apis', version: '1' })
export class ApisController {
  constructor(private readonly apisService: ApisService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new API permission entry' })
  @ApiCreatedResponse({ type: Api })
  create(@Body() dto: CreateApiDto): Promise<Api> {
    return this.apisService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List API permission entries (paginated, sortable, filterable)' })
  @ApiPaginatedResponse(Api)
  findAll(@Query() query: PaginationQueryDto) {
    return this.apisService.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count API permission entries' })
  @ApiOkResponse({ type: CountResponseDto })
  async count(@Query() query: IncludeDeletedQueryDto): Promise<CountResponseDto> {
    return new CountResponseDto(await this.apisService.count(query.includeDeleted));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an API permission entry by id' })
  @ApiOkResponse({ type: Api })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Api> {
    return this.apisService.findOne(id);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check whether an API permission entry exists' })
  @ApiOkResponse({ type: ExistsResponseDto })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<ExistsResponseDto> {
    return new ExistsResponseDto(await this.apisService.exists(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update an API permission entry' })
  @ApiOkResponse({ type: Api })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateApiDto): Promise<Api> {
    return this.apisService.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace an API permission entry' })
  @ApiOkResponse({ type: Api })
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateApiDto): Promise<Api> {
    return this.apisService.replace(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore (not supported — apis have no soft-delete flag)' })
  @ApiOkResponse({ type: Api })
  restore(@Param('id', ParseIntPipe) id: number): Promise<Api> {
    return this.apisService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an API permission entry' })
  @ApiOkResponse({ type: DeleteResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteResponseDto> {
    const result = await this.apisService.remove(id);
    return new DeleteResponseDto(result.id, result.deleted, result.softDeleted);
  }
}
