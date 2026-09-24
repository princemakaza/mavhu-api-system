import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountResponseDto, DeleteResponseDto, ExistsResponseDto } from '../../common/dto/count-response.dto';
import { IncludeDeletedQueryDto } from '../../common/dto/include-deleted-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/swagger/api-paginated-response.decorator';
import { CreateEmissionFactorDto } from './dto/create-emission-factor.dto';
import { UpdateEmissionFactorDto } from './dto/update-emission-factor.dto';
import { EmissionFactor } from './entities/emission-factor.entity';
import { EmissionFactorsService } from './emission-factors.service';

@ApiTags('Emission Factors')
@Controller({ path: 'emission-factors', version: '1' })
export class EmissionFactorsController {
  constructor(private readonly emissionFactorsService: EmissionFactorsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an emission factor' })
  @ApiCreatedResponse({ type: EmissionFactor })
  create(@Body() dto: CreateEmissionFactorDto): Promise<EmissionFactor> {
    return this.emissionFactorsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List emission factors (paginated, sortable, filterable)' })
  @ApiPaginatedResponse(EmissionFactor)
  findAll(@Query() query: PaginationQueryDto) {
    return this.emissionFactorsService.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count emission factors' })
  @ApiOkResponse({ type: CountResponseDto })
  async count(@Query() query: IncludeDeletedQueryDto): Promise<CountResponseDto> {
    return new CountResponseDto(await this.emissionFactorsService.count(query.includeDeleted));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an emission factor by id' })
  @ApiOkResponse({ type: EmissionFactor })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<EmissionFactor> {
    return this.emissionFactorsService.findOne(id);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check whether an emission factor exists' })
  @ApiOkResponse({ type: ExistsResponseDto })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<ExistsResponseDto> {
    return new ExistsResponseDto(await this.emissionFactorsService.exists(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update an emission factor' })
  @ApiOkResponse({ type: EmissionFactor })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmissionFactorDto): Promise<EmissionFactor> {
    return this.emissionFactorsService.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace an emission factor' })
  @ApiOkResponse({ type: EmissionFactor })
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateEmissionFactorDto): Promise<EmissionFactor> {
    return this.emissionFactorsService.replace(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore (not supported — emission factors have no soft-delete flag)' })
  @ApiOkResponse({ type: EmissionFactor })
  restore(@Param('id', ParseIntPipe) id: number): Promise<EmissionFactor> {
    return this.emissionFactorsService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an emission factor' })
  @ApiOkResponse({ type: DeleteResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteResponseDto> {
    const result = await this.emissionFactorsService.remove(id);
    return new DeleteResponseDto(result.id, result.deleted, result.softDeleted);
  }
}
