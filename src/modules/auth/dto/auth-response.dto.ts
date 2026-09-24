import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Jane Moyo' })
  name: string;

  @ApiProperty({ example: 'jane.moyo@greenvalley.co.zw' })
  email: string;

  @ApiProperty({ example: 1 })
  customerId: number;

  @ApiProperty({ example: 1, nullable: true })
  estateId: number | null;

  @ApiProperty({
    example: ['ESG_CONTRIBUTOR'],
    type: [String],
    description: 'Every role (AUDITOR, ESG_READER, ESG_CONTRIBUTOR, ESG_APPROVER, or any future role) currently assigned to this user.',
  })
  roles: string[];
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT bearer token — send as "Authorization: Bearer <accessToken>"' })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: '1d', description: 'Token lifetime' })
  expiresIn: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
