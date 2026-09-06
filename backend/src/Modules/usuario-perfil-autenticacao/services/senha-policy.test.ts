import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validarSenha } from './senha-policy';

describe('validarSenha', () => {
  it('aceita senha que atende a todos os requisitos', () => {
    assert.doesNotThrow(() => validarSenha('Senha@123'));
  });

  it('rejeita senha com menos de oito caracteres', () => {
    assert.throws(() => validarSenha('Aa@1234'), /pelo menos 8 caracteres/);
  });

  it('rejeita senha sem letra maiúscula', () => {
    assert.throws(() => validarSenha('senha@123'), /letra maiúscula/);
  });

  it('rejeita senha sem letra minúscula', () => {
    assert.throws(() => validarSenha('SENHA@123'), /letra minúscula/);
  });

  it('rejeita senha sem número', () => {
    assert.throws(() => validarSenha('Senha@abc'), /número/);
  });

  it('rejeita senha sem caractere especial', () => {
    assert.throws(() => validarSenha('Senha1234'), /caractere especial/);
  });

  it('rejeita senha com espaços', () => {
    assert.throws(() => validarSenha('Senha @123'), /sem espaços/);
  });

  it('rejeita senha que ultrapassa o limite seguro do bcrypt', () => {
    assert.throws(
      () => validarSenha(`Senha@1${'a'.repeat(66)}`),
      /72 bytes/
    );
  });
});
