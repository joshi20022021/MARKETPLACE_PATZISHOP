import { Module } from '@nestjs/common';
import { ResourceScopeService } from './resource-scope.service';

@Module({ providers: [ResourceScopeService], exports: [ResourceScopeService] })
export class SecurityModule {}
