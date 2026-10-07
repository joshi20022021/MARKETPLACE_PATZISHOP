import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../generated/prisma/enums';

export const PUBLIC_USER_SELECT = { id: true, name: true, email: true, role: true } as const;

export class PublicUser {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ format: 'email' })
  email!: string;
  @ApiProperty({ enum: Role })
  role!: Role;
}
