import { chavePorCampoDoCorpo, criarLimitador } from '../middlewares/limiteRequisicoes';

const MINUTO = 60 * 1000;
const QUINZE_MINUTOS = 15 * MINUTO;

function lerInteiro(valor: string | undefined, padrao: number): number {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : padrao;
}

// Políticas de rate limiting da API. Todas por IP, exceto onde indicado.
// O limite global é folgado porque usuários da mesma rede (ex.: o campus)
// saem pelo mesmo IP público; os limites estritos ficam nas rotas sensíveis.

export const limiteGlobal = criarLimitador({
  nome: 'global',
  maximo: lerInteiro(process.env.RATE_LIMIT_GLOBAL_MAX, 1000),
  janelaMs: lerInteiro(process.env.RATE_LIMIT_GLOBAL_JANELA_MS, MINUTO),
  mensagem: 'Muitas solicitações em pouco tempo. Aguarde alguns instantes e tente novamente.',
});

export const limiteLogin = criarLimitador({
  nome: 'login',
  maximo: 30,
  janelaMs: QUINZE_MINUTOS,
  mensagem: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
});

// Por conta (e-mail), contando só falhas: segura força bruta distribuída em
// vários IPs contra o mesmo usuário sem punir quem acerta a senha.
export const limiteLoginPorConta = criarLimitador({
  nome: 'login-conta',
  maximo: 10,
  janelaMs: QUINZE_MINUTOS,
  chave: chavePorCampoDoCorpo('email'),
  ignorarSucesso: true,
  mensagem: 'Muitas tentativas de login para esta conta. Aguarde alguns minutos e tente novamente.',
});

export const limiteRecuperacaoSenha = criarLimitador({
  nome: 'recuperacao-senha',
  maximo: 5,
  janelaMs: QUINZE_MINUTOS,
  mensagem: 'Muitas solicitações de recuperação de senha. Aguarde alguns minutos e tente novamente.',
});

export const limiteRedefinicaoSenha = criarLimitador({
  nome: 'redefinicao-senha',
  maximo: 15,
  janelaMs: QUINZE_MINUTOS,
  mensagem: 'Muitas tentativas de redefinição de senha. Aguarde alguns minutos e tente novamente.',
});

export const limiteInscricao = criarLimitador({
  nome: 'inscricao',
  maximo: 10,
  janelaMs: QUINZE_MINUTOS,
  mensagem: 'Muitas inscrições enviadas. Aguarde alguns minutos e tente novamente.',
});

// Consultas públicas de CPF/e-mail: sem limite viram enumeração de cadastros.
export const limiteConsultaPublica = criarLimitador({
  nome: 'consulta-publica',
  maximo: 60,
  janelaMs: QUINZE_MINUTOS,
  mensagem: 'Muitas consultas em pouco tempo. Aguarde alguns minutos e tente novamente.',
});

export const limiteDocumentosPublicos = criarLimitador({
  nome: 'documentos-publicos',
  maximo: 40,
  janelaMs: QUINZE_MINUTOS,
  mensagem: 'Muitos envios de documentos em pouco tempo. Aguarde alguns minutos e tente novamente.',
});
