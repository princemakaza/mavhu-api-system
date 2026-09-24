import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Api } from '../../apis/entities/api.entity';
import { Role } from '../../roles/entities/role.entity';

@Entity({ name: 'role_permissions', schema: 'mavhu' })
export class RolePermission {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ name: 'role_id', type: 'int' })
  roleId: number;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @ApiProperty({ example: 1 })
  @Column({ name: 'api_id', type: 'int' })
  apiId: number;

  @ManyToOne(() => Api, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'api_id' })
  api?: Api;
}
