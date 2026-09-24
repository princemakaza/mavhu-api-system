import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'apis', schema: 'mavhu' })
export class Api {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'emissions_accounting.write' })
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;
}
