import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountResponseDto, DeleteResponseDto, ExistsResponseDto } from '../../common/dto/count-response.dto';
import { IncludeDeletedQueryDto } from '../../common/dto/include-deleted-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/swagger/api-paginated-response.decorator';
import { CreateEstateDto } from './dto/create-estate.dto';
import { UpdateEstateDto } from './dto/update-estate.dto';
import { Estate } from './entities/estate.entity';
import { EstatesService } from './estates.service';

@ApiTags('Estates')
@Controller({ path: 'estates', version: '1' })
export class EstatesController {
  constructor(private readonly estatesService: EstatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an estate' })
  @ApiCreatedResponse({ type: Estate })
  create(@Body() dto: CreateEstateDto): Promise<Estate> {
    return this.estatesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List estates (paginated, sortable, filterable)' })
  @ApiPaginatedResponse(Estate)
  findAll(@Query() query: PaginationQueryDto) {
    return this.estatesService.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count estates' })
  @ApiOkResponse({ type: CountResponseDto })
  async count(@Query() query: IncludeDeletedQueryDto): Promise<CountResponseDto> {
    return new CountResponseDto(await this.estatesService.count(query.includeDeleted));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an estate by id' })
  @ApiOkResponse({ type: Estate })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Estate> {
    return this.estatesService.findOne(id);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check whether an estate exists' })
  @ApiOkResponse({ type: ExistsResponseDto })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<ExistsResponseDto> {
    return new ExistsResponseDto(await this.estatesService.exists(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update an estate' })
  @ApiOkResponse({ type: Estate })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEstateDto): Promise<Estate> {
    return this.estatesService.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace an estate' })
  @ApiOkResponse({ type: Estate })
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateEstateDto): Promise<Estate> {
    return this.estatesService.replace(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore an estate (not supported — estates have no soft-delete flag)' })
  @ApiOkResponse({ type: Estate })
  restore(@Param('id', ParseIntPipe) id: number): Promise<Estate> {
    return this.estatesService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an estate' })
  @ApiOkResponse({ type: DeleteResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteResponseDto> {
    const result = await this.estatesService.remove(id);
    return new DeleteResponseDto(result.id, result.deleted, result.softDeleted);
  }
}
