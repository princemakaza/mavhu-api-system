import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Bank } from '../../banks/entities/bank.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Entity({ name: 'bank_customers', schema: 'mavhu' })
export class BankCustomer {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ name: 'bank_id', type: 'int' })
  bankId: number;

  @ManyToOne(() => Bank, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'bank_id' })
  bank?: Bank;

  @ApiProperty({ example: 1 })
  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @ApiProperty({ example: 'FNB-CUST-000123' })
  @Column({ name: 'customer_reference_number', type: 'varchar', length: 255 })
  customerReferenceNumber: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
