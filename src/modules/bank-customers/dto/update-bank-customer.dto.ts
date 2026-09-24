import { PartialType } from '@nestjs/swagger';
import { CreateBankCustomerDto } from './create-bank-customer.dto';

export class UpdateBankCustomerDto extends PartialType(CreateBankCustomerDto) {}
