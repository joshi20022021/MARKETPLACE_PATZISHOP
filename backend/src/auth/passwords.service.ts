import { randomBytes } from 'node:crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { compare, hash } from 'bcrypt';

@Injectable()
export class PasswordsService implements OnModuleInit {
  private dummyHash!: string;

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hash(randomBytes(32).toString('hex'));
  }

  hash(password: string): Promise<string> {
    return hash(password, 12);
  }

  verify(password: string, passwordHash?: string): Promise<boolean> {
    return compare(password, passwordHash ?? this.dummyHash);
  }
}
