import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateBankCustomerDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  bankId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  customerId: number;

  @ApiProperty({ example: 'FNB-CUST-000123', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  customerReferenceNumber: string;
}
