import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';

@Entity({ name: 'emission_factors', schema: 'mavhu' })
export class EmissionFactor {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Diesel' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 'Combustion', description: 'Component of the emission source' })
  @Column({ type: 'varchar', length: 255 })
  component: string;

  @ApiProperty({ example: 2.6801, description: 'Emission factor value' })
  @Column({ type: 'decimal', precision: 10, scale: 4, transformer: new DecimalTransformer() })
  factor: number;

  @ApiProperty({ example: 1, description: 'Global warming potential' })
  @Column({ type: 'decimal', precision: 10, scale: 4, transformer: new DecimalTransformer() })
  gwp: number;

  @ApiProperty({ required: false, nullable: true, example: 'kg CO2e per litre of diesel burned' })
  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @ApiProperty({ example: 'litre' })
  @Column({ type: 'varchar', length: 255 })
  unit: string;
}
