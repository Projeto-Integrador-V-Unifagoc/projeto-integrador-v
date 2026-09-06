export const MENSAGEM_REQUISITOS_SENHA =
  'A senha deve ter pelo menos 8 caracteres, com letra maiúscula, letra minúscula, número e caractere especial, sem espaços.';

export function obterErroSenha(senha: string): string | null {
  if (!senha) {
    return 'A senha é obrigatória.';
  }

  if (
    senha.length < 8 ||
    !/[A-Z]/.test(senha) ||
    !/[a-z]/.test(senha) ||
    !/[0-9]/.test(senha) ||
    !/[^A-Za-z0-9\s]/.test(senha) ||
    /\s/.test(senha)
  ) {
    return MENSAGEM_REQUISITOS_SENHA;
  }

  if (new TextEncoder().encode(senha).length > 72) {
    return 'A senha não pode ultrapassar 72 bytes.';
  }

  return null;
}
