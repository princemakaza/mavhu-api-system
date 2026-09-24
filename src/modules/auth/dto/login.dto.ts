import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane.moyo@greenvalley.co.zw' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Str0ngP@ssword!' })
  @IsString()
  password: string;
}
