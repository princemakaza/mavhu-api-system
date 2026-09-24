import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

@Entity({ name: 'estates', schema: 'mavhu' })
export class Estate {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'North Block Estate' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 120, description: 'Hectares covered by this estate' })
  @Column({ type: 'int' })
  hectares: number;

  @ApiProperty({ example: 1, description: 'Owning customer id' })
  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @ApiProperty({ example: 'Zimbabwe' })
  @Column({ type: 'varchar', length: 255 })
  country: string;

  @ApiProperty({ example: 'estate@greenvalley.co.zw' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @ApiProperty({ example: '+263771234567', required: false, nullable: true })
  @Column({ name: 'phone_number', type: 'varchar', length: 255, nullable: true })
  phoneNumber: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
