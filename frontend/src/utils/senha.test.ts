import { describe, expect, it } from 'vitest';

import { obterErroSenha } from './senha';

describe('obterErroSenha', () => {
  it('aceita senha que atende a todos os requisitos', () => {
    expect(obterErroSenha('Senha@123')).toBeNull();
  });

  it.each([
    'Aa@1234',
    'senha@123',
    'SENHA@123',
    'Senha@abc',
    'Senha1234',
    'Senha @123',
  ])('rejeita senha insegura: %s', (senha) => {
    expect(obterErroSenha(senha)).not.toBeNull();
  });

  it('rejeita senha acima do limite seguro do bcrypt', () => {
    expect(obterErroSenha(`Senha@1${'a'.repeat(66)}`)).toMatch(/72 bytes/);
  });
});
