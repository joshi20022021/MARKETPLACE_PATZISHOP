import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE_KEY = 'patzishop:public';
export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
