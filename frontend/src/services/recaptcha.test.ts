import { expect, it } from 'vitest';
import { exigirTokenRecaptcha } from './recaptcha';

it('impede o envio sem verificação concluída', () => {
  expect(() => exigirTokenRecaptcha('')).toThrow('Não sou um robô');
  expect(() => exigirTokenRecaptcha('   ')).toThrow('Não sou um robô');
});

it('preserva o token da verificação para envio ao backend', () => {
  expect(exigirTokenRecaptcha('token-google')).toBe('token-google');
});
