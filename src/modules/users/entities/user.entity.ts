import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Estate } from '../../estates/entities/estate.entity';

@Entity({ name: 'users', schema: 'mavhu' })
export class User {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Jane Moyo' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 1 })
  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @ApiProperty({ example: 1, required: false, nullable: true })
  @Column({ name: 'estate_id', type: 'int', nullable: true })
  estateId: number | null;

  @ManyToOne(() => Estate, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'estate_id' })
  estate?: Estate | null;

  @ApiProperty({ example: 'jane.moyo@greenvalley.co.zw' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // Never exposed in API responses; hashed at the service layer before persisting.
  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password: string;

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
