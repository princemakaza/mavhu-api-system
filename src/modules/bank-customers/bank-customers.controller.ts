import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountResponseDto, DeleteResponseDto, ExistsResponseDto } from '../../common/dto/count-response.dto';
import { IncludeDeletedQueryDto } from '../../common/dto/include-deleted-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/swagger/api-paginated-response.decorator';
import { BankCustomersService } from './bank-customers.service';
import { CreateBankCustomerDto } from './dto/create-bank-customer.dto';
import { UpdateBankCustomerDto } from './dto/update-bank-customer.dto';
import { BankCustomer } from './entities/bank-customer.entity';

@ApiTags('Bank Customers')
@Controller({ path: 'bank-customers', version: '1' })
export class BankCustomersController {
  constructor(private readonly bankCustomersService: BankCustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Link a customer to a bank' })
  @ApiCreatedResponse({ type: BankCustomer })
  create(@Body() dto: CreateBankCustomerDto): Promise<BankCustomer> {
    return this.bankCustomersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bank-customer links (paginated, sortable, filterable)' })
  @ApiPaginatedResponse(BankCustomer)
  findAll(@Query() query: PaginationQueryDto) {
    return this.bankCustomersService.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count bank-customer links' })
  @ApiOkResponse({ type: CountResponseDto })
  async count(@Query() query: IncludeDeletedQueryDto): Promise<CountResponseDto> {
    return new CountResponseDto(await this.bankCustomersService.count(query.includeDeleted));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bank-customer link by id' })
  @ApiOkResponse({ type: BankCustomer })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<BankCustomer> {
    return this.bankCustomersService.findOne(id);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check whether a bank-customer link exists' })
  @ApiOkResponse({ type: ExistsResponseDto })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<ExistsResponseDto> {
    return new ExistsResponseDto(await this.bankCustomersService.exists(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a bank-customer link' })
  @ApiOkResponse({ type: BankCustomer })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBankCustomerDto): Promise<BankCustomer> {
    return this.bankCustomersService.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace a bank-customer link' })
  @ApiOkResponse({ type: BankCustomer })
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateBankCustomerDto): Promise<BankCustomer> {
    return this.bankCustomersService.replace(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore (not supported — bank-customer links have no soft-delete flag)' })
  @ApiOkResponse({ type: BankCustomer })
  restore(@Param('id', ParseIntPipe) id: number): Promise<BankCustomer> {
    return this.bankCustomersService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bank-customer link' })
  @ApiOkResponse({ type: DeleteResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteResponseDto> {
    const result = await this.bankCustomersService.remove(id);
    return new DeleteResponseDto(result.id, result.deleted, result.softDeleted);
  }
}
