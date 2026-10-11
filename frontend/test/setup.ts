import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { vi } from 'vitest';
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), configurable: true });
afterEach(() => cleanup());
