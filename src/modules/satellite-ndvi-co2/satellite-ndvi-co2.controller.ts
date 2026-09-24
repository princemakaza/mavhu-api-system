import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountResponseDto, DeleteResponseDto, ExistsResponseDto } from '../../common/dto/count-response.dto';
import { IncludeDeletedQueryDto } from '../../common/dto/include-deleted-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/swagger/api-paginated-response.decorator';
import { CreateSatelliteNdviCo2Dto } from './dto/create-satellite-ndvi-co2.dto';
import { UpdateSatelliteNdviCo2Dto } from './dto/update-satellite-ndvi-co2.dto';
import { SatelliteNdviCo2 } from './entities/satellite-ndvi-co2.entity';
import { SatelliteNdviCo2Service } from './satellite-ndvi-co2.service';

@ApiTags('Satellite NDVI/CO2')
@Controller({ path: 'satellite-ndvi-co2', version: '1' })
export class SatelliteNdviCo2Controller {
  constructor(private readonly satelliteNdviCo2Service: SatelliteNdviCo2Service) {}

  @Post()
  @ApiOperation({ summary: 'Record a satellite NDVI/CO2 reading for an estate on a given date' })
  @ApiCreatedResponse({ type: SatelliteNdviCo2 })
  create(@Body() dto: CreateSatelliteNdviCo2Dto): Promise<SatelliteNdviCo2> {
    return this.satelliteNdviCo2Service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List satellite NDVI/CO2 readings (paginated, sortable, filterable)' })
  @ApiPaginatedResponse(SatelliteNdviCo2)
  findAll(@Query() query: PaginationQueryDto) {
    return this.satelliteNdviCo2Service.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count satellite NDVI/CO2 readings' })
  @ApiOkResponse({ type: CountResponseDto })
  async count(@Query() query: IncludeDeletedQueryDto): Promise<CountResponseDto> {
    return new CountResponseDto(await this.satelliteNdviCo2Service.count(query.includeDeleted));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a satellite NDVI/CO2 reading by id' })
  @ApiOkResponse({ type: SatelliteNdviCo2 })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SatelliteNdviCo2> {
    return this.satelliteNdviCo2Service.findOne(id);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check whether a satellite NDVI/CO2 reading exists' })
  @ApiOkResponse({ type: ExistsResponseDto })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<ExistsResponseDto> {
    return new ExistsResponseDto(await this.satelliteNdviCo2Service.exists(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a satellite NDVI/CO2 reading' })
  @ApiOkResponse({ type: SatelliteNdviCo2 })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSatelliteNdviCo2Dto,
  ): Promise<SatelliteNdviCo2> {
    return this.satelliteNdviCo2Service.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace a satellite NDVI/CO2 reading' })
  @ApiOkResponse({ type: SatelliteNdviCo2 })
  replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSatelliteNdviCo2Dto,
  ): Promise<SatelliteNdviCo2> {
    return this.satelliteNdviCo2Service.replace(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore (not supported — satellite readings have no soft-delete flag)' })
  @ApiOkResponse({ type: SatelliteNdviCo2 })
  restore(@Param('id', ParseIntPipe) id: number): Promise<SatelliteNdviCo2> {
    return this.satelliteNdviCo2Service.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a satellite NDVI/CO2 reading' })
  @ApiOkResponse({ type: DeleteResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteResponseDto> {
    const result = await this.satelliteNdviCo2Service.remove(id);
    return new DeleteResponseDto(result.id, result.deleted, result.softDeleted);
  }
}
