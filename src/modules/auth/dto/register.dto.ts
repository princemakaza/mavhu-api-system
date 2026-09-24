import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEmail, IsInt, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Jane Moyo', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 1, description: 'Customer this user belongs to' })
  @IsInt()
  @IsPositive()
  customerId: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  estateId?: number;

  @ApiProperty({ example: 'jane.moyo@greenvalley.co.zw', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Str0ngP@ssword!', minLength: 8, writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password: string;

  @ApiPropertyOptional({
    description:
      'Roles to grant at signup. Self-registrable: "ESG_READER", "ESG_CONTRIBUTOR", "ESG_APPROVER". ' +
      'Other roles (MAVHU_ADMIN, AUDITOR) are provisioned by Mavhu and rejected here.',
    example: ['ESG_CONTRIBUTOR'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roleNames?: string[];
}
