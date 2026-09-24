import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountResponseDto, DeleteResponseDto, ExistsResponseDto } from '../../common/dto/count-response.dto';
import { IncludeDeletedQueryDto } from '../../common/dto/include-deleted-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/swagger/api-paginated-response.decorator';
import { CropCyclesService } from './crop-cycles.service';
import { CreateCropCycleDto } from './dto/create-crop-cycle.dto';
import { UpdateCropCycleDto } from './dto/update-crop-cycle.dto';
import { CropCycle } from './entities/crop-cycle.entity';

@ApiTags('Crop Cycles')
@Controller({ path: 'crop-cycles', version: '1' })
export class CropCyclesController {
  constructor(private readonly cropCyclesService: CropCyclesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a crop cycle' })
  @ApiCreatedResponse({ type: CropCycle })
  create(@Body() dto: CreateCropCycleDto): Promise<CropCycle> {
    return this.cropCyclesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List crop cycles (paginated, sortable, filterable)' })
  @ApiPaginatedResponse(CropCycle)
  findAll(@Query() query: PaginationQueryDto) {
    return this.cropCyclesService.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count crop cycles' })
  @ApiOkResponse({ type: CountResponseDto })
  async count(@Query() query: IncludeDeletedQueryDto): Promise<CountResponseDto> {
    return new CountResponseDto(await this.cropCyclesService.count(query.includeDeleted));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a crop cycle by id' })
  @ApiOkResponse({ type: CropCycle })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<CropCycle> {
    return this.cropCyclesService.findOne(id);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check whether a crop cycle exists' })
  @ApiOkResponse({ type: ExistsResponseDto })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<ExistsResponseDto> {
    return new ExistsResponseDto(await this.cropCyclesService.exists(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a crop cycle' })
  @ApiOkResponse({ type: CropCycle })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCropCycleDto): Promise<CropCycle> {
    return this.cropCyclesService.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace a crop cycle' })
  @ApiOkResponse({ type: CropCycle })
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCropCycleDto): Promise<CropCycle> {
    return this.cropCyclesService.replace(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore (not supported — crop cycles have no soft-delete flag)' })
  @ApiOkResponse({ type: CropCycle })
  restore(@Param('id', ParseIntPipe) id: number): Promise<CropCycle> {
    return this.cropCyclesService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a crop cycle' })
  @ApiOkResponse({ type: DeleteResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteResponseDto> {
    const result = await this.cropCyclesService.remove(id);
    return new DeleteResponseDto(result.id, result.deleted, result.softDeleted);
  }
}
