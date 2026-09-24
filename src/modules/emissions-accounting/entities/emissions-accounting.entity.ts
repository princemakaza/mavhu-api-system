import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';
import { CropCycle } from '../../crop-cycles/entities/crop-cycle.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { EmissionFactor } from '../../emission-factors/entities/emission-factor.entity';
import { Estate } from '../../estates/entities/estate.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'emissions_accounting', schema: 'mavhu' })
export class EmissionsAccounting {
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

  @ApiProperty({ required: false, nullable: true, example: 1 })
  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User | null;

  @ApiProperty({ example: 1 })
  @Column({ name: 'crop_cycle_id', type: 'int' })
  cropCycleId: number;

  @ManyToOne(() => CropCycle, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'crop_cycle_id' })
  cropCycle?: CropCycle;

  @ApiProperty({ example: 1 })
  @Column({ name: 'emission_id', type: 'int' })
  emissionId: number;

  @ManyToOne(() => EmissionFactor, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'emission_id' })
  emissionFactor?: EmissionFactor;

  @ApiProperty({ example: 150.5 })
  @Column({ type: 'decimal', precision: 10, scale: 4, transformer: new DecimalTransformer() })
  quantity: number;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @ApiProperty({ example: '2026-03-31T00:00:00.000Z' })
  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate: Date;

  @ApiProperty({ required: false, nullable: true, description: 'quantity * emission_factors.factor / 1000' })
  @Column({
    name: 'ton_co2e',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
    transformer: new DecimalTransformer(),
  })
  tonCo2e: number | null;

  @ApiProperty({ example: 1, minimum: 1, maximum: 3 })
  @Column({ type: 'int' })
  scope: number;

  @ApiProperty({ default: false })
  @Column({ type: 'boolean', default: false })
  approved: boolean;

  @ApiProperty({ required: false, nullable: true, example: 1 })
  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser?: User | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ name: 'audit_trail', type: 'text', nullable: true })
  auditTrail: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'text', nullable: true })
  note: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
