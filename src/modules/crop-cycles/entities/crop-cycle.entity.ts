import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Estate } from '../../estates/entities/estate.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'crop_cycles', schema: 'mavhu' })
export class CropCycle {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @ApiProperty({ example: 1 })
  @Column({ name: 'estate_id', type: 'int' })
  estateId: number;

  @ManyToOne(() => Estate, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'estate_id' })
  estate?: Estate;

  @ApiProperty({ example: 1 })
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ApiProperty({ example: '2026 Maize Season' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate: Date;

  @ApiProperty({ required: false, nullable: true })
  @Column({ name: 'audit_trail', type: 'text', nullable: true })
  auditTrail: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
