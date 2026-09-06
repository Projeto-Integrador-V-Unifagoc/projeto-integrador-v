const MENSAGEM_REQUISITOS =
  'A senha deve ter pelo menos 8 caracteres, com letra maiúscula, letra minúscula, número e caractere especial, sem espaços.';

export function validarSenha(senha: unknown): asserts senha is string {
  if (typeof senha !== 'string' || senha.length === 0) {
    throw new Error('A senha é obrigatória.');
  }

  if (
    senha.length < 8 ||
    !/[A-Z]/.test(senha) ||
    !/[a-z]/.test(senha) ||
    !/[0-9]/.test(senha) ||
    !/[^A-Za-z0-9\s]/.test(senha) ||
    /\s/.test(senha)
  ) {
    throw new Error(MENSAGEM_REQUISITOS);
  }

  if (Buffer.byteLength(senha, 'utf8') > 72) {
    throw new Error('A senha não pode ultrapassar 72 bytes.');
  }
}

export { MENSAGEM_REQUISITOS };
