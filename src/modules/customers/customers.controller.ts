import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountResponseDto, DeleteResponseDto, ExistsResponseDto } from '../../common/dto/count-response.dto';
import { IncludeDeletedQueryDto } from '../../common/dto/include-deleted-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/swagger/api-paginated-response.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

@ApiTags('Customers')
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer' })
  @ApiCreatedResponse({ type: Customer })
  create(@Body() dto: CreateCustomerDto): Promise<Customer> {
    return this.customersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers (paginated, sortable, filterable)' })
  @ApiPaginatedResponse(Customer)
  findAll(@Query() query: PaginationQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count customers' })
  @ApiOkResponse({ type: CountResponseDto })
  async count(@Query() query: IncludeDeletedQueryDto): Promise<CountResponseDto> {
    return new CountResponseDto(await this.customersService.count(query.includeDeleted));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by id' })
  @ApiOkResponse({ type: Customer })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Customer> {
    return this.customersService.findOne(id);
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check whether a customer exists' })
  @ApiOkResponse({ type: ExistsResponseDto })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<ExistsResponseDto> {
    return new ExistsResponseDto(await this.customersService.exists(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a customer' })
  @ApiOkResponse({ type: Customer })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto): Promise<Customer> {
    return this.customersService.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace a customer' })
  @ApiOkResponse({ type: Customer })
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCustomerDto): Promise<Customer> {
    return this.customersService.replace(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted customer' })
  @ApiOkResponse({ type: Customer })
  restore(@Param('id', ParseIntPipe) id: number): Promise<Customer> {
    return this.customersService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer (soft delete)' })
  @ApiOkResponse({ type: DeleteResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteResponseDto> {
    const result = await this.customersService.remove(id);
    return new DeleteResponseDto(result.id, result.deleted, result.softDeleted);
  }
}
