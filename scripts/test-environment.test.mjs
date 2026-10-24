import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateTestDatabase } from './test-environment.mjs';
test('solo acepta la base de pruebas local y nunca deriva la base de desarrollo', () => {
  assert.equal(
    validateTestDatabase('postgresql://fixture:fake@127.0.0.1:5433/patzishop_test'),
    'postgresql://fixture:fake@127.0.0.1:5433/patzishop_test',
  );
  for (const value of [
    undefined,
    'invalid',
    'postgresql://fixture:SECRET@127.0.0.1/patzishop',
    'postgresql://fixture:SECRET@db.example.com/patzishop_test',
    'postgresql://fixture:SECRET@localhost/patzishop_test?schema=public',
    'postgresql://fixture:SECRET@localhost/patzishop_test#x',
  ]) {
    assert.throws(
      () => validateTestDatabase(value),
      (error) => error instanceof Error && !error.message.includes('SECRET'),
    );
  }
});
