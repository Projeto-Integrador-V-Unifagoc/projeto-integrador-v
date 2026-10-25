import { describe, expect, it } from 'vitest';
import { lerTrustProxy } from './trustProxy';

describe('lerTrustProxy', () => {
  it.each([
    [undefined, false],
    ['', false],
    ['  ', false],
    ['false', false],
    ['FALSE', false],
    ['true', true],
    ['1', 1],
    [' 2 ', 2],
    ['loopback, uniquelocal', 'loopback, uniquelocal'],
  ])('%j → %j', (valor, esperado) => {
    expect(lerTrustProxy(valor)).toBe(esperado);
  });
});
