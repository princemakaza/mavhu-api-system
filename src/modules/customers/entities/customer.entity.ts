import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CustomerIdentifier } from './customer-identifier.enum';

@Entity({ name: 'customers', schema: 'mavhu' })
export class Customer {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Green Valley Estates' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 500, description: 'Total hectares under management' })
  @Column({ type: 'int' })
  hectares: number;

  @ApiProperty({ example: 'Zimbabwe' })
  @Column({ type: 'varchar', length: 255 })
  country: string;

  @ApiProperty({ example: 'ops@greenvalley.co.zw' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @ApiProperty({ example: '+263771234567', required: false, nullable: true })
  @Column({ name: 'phone_number', type: 'varchar', length: 255, nullable: true })
  phoneNumber: string | null;

  @ApiProperty({ enum: CustomerIdentifier, example: CustomerIdentifier.AGROBUSINESS })
  @Column({ type: 'enum', enum: CustomerIdentifier, enumName: 'customer_identifier' })
  identifier: CustomerIdentifier;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ApiProperty({ default: false })
  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;
}
