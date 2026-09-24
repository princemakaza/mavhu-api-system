import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountResponseDto, DeleteResponseDto, ExistsResponseDto } from '../../common/dto/count-response.dto';
import { IncludeDeletedQueryDto } from '../../common/dto/include-deleted-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/swagger/api-paginated-response.decorator';
import { CreateEmissionsAccountingDto } from './dto/create-emissions-accounting.dto';
import { UpdateEmissionsAccountingDto } from './dto/update-emissions-accounting.dto';
import { EmissionsAccounting } from './entities/emissions-accounting.entity';
import { EmissionsAccountingService } from './emissions-accounting.service';

@ApiTags('Emissions Accounting')
@Controller({ path: 'emissions-accounting', version: '1' })
export class EmissionsAccountingController {
  constructor(private readonly emissionsAccountingService: EmissionsAccountingService) {}

  @Post()
  @ApiOperation({ summary: 'Create an emissions accounting entry' })
  @ApiCreatedResponse({ type: EmissionsAccounting })
  create(@Body() dto: CreateEmissionsAccountingDto): Promise<EmissionsAccounting> {
    return this.emissionsAccountingService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List emissions accounting entries (paginated, sortable, filterable)' })
  @ApiPaginatedResponse(EmissionsAccounting)
  findAll(@Query() query: PaginationQueryDto) {
    return this.emissionsAccountingService.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count emissions accounting entries' })
  @ApiOkResponse({ type: CountResponseDto })
  async count(@Query() query: IncludeDeletedQueryDto): Promise<CountResponseDto> {
    return new CountResponseDto(await this.emissionsAccountingService.count(query.includeDeleted));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an emissions accounting entry by id' })
  @ApiOkResponse({ type: EmissionsAccounting })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<EmissionsAccounting> {
    return this.emissionsAccountingService.findOne(id);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check whether an emissions accounting entry exists' })
  @ApiOkResponse({ type: ExistsResponseDto })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<ExistsResponseDto> {
    return new ExistsResponseDto(await this.emissionsAccountingService.exists(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update an emissions accounting entry' })
  @ApiOkResponse({ type: EmissionsAccounting })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmissionsAccountingDto,
  ): Promise<EmissionsAccounting> {
    return this.emissionsAccountingService.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace an emissions accounting entry' })
  @ApiOkResponse({ type: EmissionsAccounting })
  replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEmissionsAccountingDto,
  ): Promise<EmissionsAccounting> {
    return this.emissionsAccountingService.replace(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore (not supported — emissions accounting entries have no soft-delete flag)' })
  @ApiOkResponse({ type: EmissionsAccounting })
  restore(@Param('id', ParseIntPipe) id: number): Promise<EmissionsAccounting> {
    return this.emissionsAccountingService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an emissions accounting entry' })
  @ApiOkResponse({ type: DeleteResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteResponseDto> {
    const result = await this.emissionsAccountingService.remove(id);
    return new DeleteResponseDto(result.id, result.deleted, result.softDeleted);
  }
}
