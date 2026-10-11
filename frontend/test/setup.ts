import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
configure({ asyncUtilTimeout: 5000 });
import { vi } from 'vitest';
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), configurable: true });
afterEach(() => cleanup());
