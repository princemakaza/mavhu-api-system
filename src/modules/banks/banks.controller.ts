import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountResponseDto, DeleteResponseDto, ExistsResponseDto } from '../../common/dto/count-response.dto';
import { IncludeDeletedQueryDto } from '../../common/dto/include-deleted-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/swagger/api-paginated-response.decorator';
import { BanksService } from './banks.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { Bank } from './entities/bank.entity';

@ApiTags('Banks')
@Controller({ path: 'banks', version: '1' })
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a bank' })
  @ApiCreatedResponse({ type: Bank })
  create(@Body() dto: CreateBankDto): Promise<Bank> {
    return this.banksService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List banks (paginated, sortable, filterable)' })
  @ApiPaginatedResponse(Bank)
  findAll(@Query() query: PaginationQueryDto) {
    return this.banksService.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count banks' })
  @ApiOkResponse({ type: CountResponseDto })
  async count(@Query() query: IncludeDeletedQueryDto): Promise<CountResponseDto> {
    return new CountResponseDto(await this.banksService.count(query.includeDeleted));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bank by id' })
  @ApiOkResponse({ type: Bank })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Bank> {
    return this.banksService.findOne(id);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check whether a bank exists' })
  @ApiOkResponse({ type: ExistsResponseDto })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<ExistsResponseDto> {
    return new ExistsResponseDto(await this.banksService.exists(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a bank' })
  @ApiOkResponse({ type: Bank })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBankDto): Promise<Bank> {
    return this.banksService.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace a bank' })
  @ApiOkResponse({ type: Bank })
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateBankDto): Promise<Bank> {
    return this.banksService.replace(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted bank' })
  @ApiOkResponse({ type: Bank })
  restore(@Param('id', ParseIntPipe) id: number): Promise<Bank> {
    return this.banksService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bank (soft delete)' })
  @ApiOkResponse({ type: DeleteResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteResponseDto> {
    const result = await this.banksService.remove(id);
    return new DeleteResponseDto(result.id, result.deleted, result.softDeleted);
  }
}
