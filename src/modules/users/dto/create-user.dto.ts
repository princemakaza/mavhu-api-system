import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Jane Moyo', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 1 })
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
}
