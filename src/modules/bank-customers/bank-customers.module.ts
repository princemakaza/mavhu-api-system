import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankCustomersController } from './bank-customers.controller';
import { BankCustomersService } from './bank-customers.service';
import { BankCustomer } from './entities/bank-customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BankCustomer])],
  controllers: [BankCustomersController],
  providers: [BankCustomersService],
  exports: [BankCustomersService],
})
export class BankCustomersModule {}
