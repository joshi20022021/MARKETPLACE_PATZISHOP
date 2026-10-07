import { ApiProperty } from '@nestjs/swagger';
import { PublicUser } from '../../users/public-user';

export class AuthResponse {
  @ApiProperty({ example: true })
  success!: true;
  @ApiProperty()
  accessToken!: string;
  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';
  @ApiProperty({ example: 900, description: 'Duración del access token, en segundos' })
  expiresIn!: number;
  @ApiProperty({ type: PublicUser })
  user!: PublicUser;
}
