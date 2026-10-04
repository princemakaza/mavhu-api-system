import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'banks', schema: 'mavhu' })
export class Bank {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'First National Bank' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 'Zimbabwe' })
  @Column({ type: 'varchar', length: 255 })
  country: string;

  @ApiProperty({ example: 'contact@fnb.co.zw' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @ApiProperty({ example: '+263771234567', required: false, nullable: true })
  @Column({ name: 'phone_number', type: 'varchar', length: 255, nullable: true })
  phoneNumber: string | null;

  @ApiProperty({ example: 'FNB-ZW-001' })
  @Column({ type: 'varchar', length: 255 })
  identifier: string;

  @ApiProperty({ example: 'active', enum: ['onboarding', 'active', 'suspended'] })
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @ApiProperty({ example: ['snapshot', 'portfolio'], description: 'Dashboard modules this bank has licensed' })
  @Column({ type: 'text', array: true })
  modules: string[];

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
