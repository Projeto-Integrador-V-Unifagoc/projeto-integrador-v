import type { Api } from "../helpers/api.js";

export type ModeloRegraPontuacao = "100" | "120" | "300" | "100.01";

export interface SubgrupoPontuacao {
  nome: string;
  orcamentoPontos: string;
  modoQuantidade: "FIXA" | "SEM_LIMITE";
  quantidadeFixa: number | null;
  ordem: number;
}

export interface DadosRegraPontuacao {
  versaoEsperada: null;
  totalPontos: string;
  subgrupos: SubgrupoPontuacao[];
}

export interface RegraPontuacaoCriada {
  id: string;
  cursoId: string;
  periodoLetivoId: string;
  totalPontos: string;
  origem: "CONFIGURADA";
  versao: number;
  estado: "DISPONIVEL";
  usadaEm: null;
  subgrupos: (SubgrupoPontuacao & { id: string })[];
}

const modelos: Record<ModeloRegraPontuacao, {
  total: string;
  provas: string;
  institucional: string;
  trabalhos: string;
  quantidadeProvas: number;
}> = {
  "100": { total: "100.00", provas: "60.00", institucional: "5.00", trabalhos: "35.00", quantidadeProvas: 3 },
  "120": { total: "120.00", provas: "72.00", institucional: "6.00", trabalhos: "42.00", quantidadeProvas: 4 },
  "300": { total: "300.00", provas: "180.00", institucional: "15.00", trabalhos: "105.00", quantidadeProvas: 3 },
  "100.01": { total: "100.01", provas: "60.00", institucional: "5.00", trabalhos: "35.01", quantidadeProvas: 3 },
};

/** Escolha obrigatória, sem padrão de regra para um novo par curso/período. */
export function dadosRegraPontuacao(modelo: ModeloRegraPontuacao): DadosRegraPontuacao {
  if (typeof modelo !== "string" || !Object.prototype.hasOwnProperty.call(modelos, modelo)) {
    throw new Error("Modelo explícito de regra inválido. Use 100, 120, 300 ou 100.01.");
  }
  const dados = modelos[modelo];
  return {
    versaoEsperada: null,
    totalPontos: dados.total,
    subgrupos: [
      { nome: "Provas", orcamentoPontos: dados.provas, modoQuantidade: "FIXA", quantidadeFixa: dados.quantidadeProvas, ordem: 0 },
      { nome: "Avaliações institucionais", orcamentoPontos: dados.institucional, modoQuantidade: "FIXA", quantidadeFixa: 1, ordem: 1 },
      { nome: "Trabalhos e projetos", orcamentoPontos: dados.trabalhos, modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 2 },
    ],
  };
}

export async function criarRegraPontuacao(
  api: Api,
  cursoId: string,
  periodoLetivoId: string,
  modelo: ModeloRegraPontuacao,
): Promise<RegraPontuacaoCriada> {
  const dados = dadosRegraPontuacao(modelo);
  const resposta = await api.put(`/regras-pontuacao/cursos/${cursoId}/periodos/${periodoLetivoId}`, { body: dados });
  if (resposta.status !== 201) {
    throw new Error(`Falha ao criar regra explícita: HTTP ${resposta.status}.`);
  }
  const regra: RegraPontuacaoCriada = resposta.body;
  if (!regra || typeof regra.id !== "string" || !regra.id
    || regra.cursoId !== cursoId || regra.periodoLetivoId !== periodoLetivoId
    || regra.totalPontos !== dados.totalPontos || regra.origem !== "CONFIGURADA"
    || regra.versao !== 1 || regra.estado !== "DISPONIVEL" || regra.usadaEm !== null
    || !Array.isArray(regra.subgrupos) || regra.subgrupos.length !== dados.subgrupos.length) {
    throw new Error("Resposta da criação de regra não corresponde ao contrato da fixture.");
  }
  for (const esperado of dados.subgrupos) {
    const criado = regra.subgrupos.find((subgrupo) => subgrupo.ordem === esperado.ordem);
    if (!criado || typeof criado.id !== "string" || !criado.id
      || criado.nome !== esperado.nome || criado.orcamentoPontos !== esperado.orcamentoPontos
      || criado.modoQuantidade !== esperado.modoQuantidade || criado.quantidadeFixa !== esperado.quantidadeFixa) {
      throw new Error("Subgrupo retornado não corresponde à composição explícita da fixture.");
    }
  }
  return regra;
}

export interface FixtureHistorica100 {
  totalPontos: "100.00";
  origemEsperadaAposAdocao: "HISTORICA";
  subgruposEsperados: SubgrupoPontuacao[];
  avaliacoesRegulares: { tipo: "PROVA" | "TPI" | "TRABALHO"; valor: string }[];
  recuperacao: { tipo: "RECUPERACAO"; valor: "100.00" };
}

/**
 * Dataset legado separado: inserir antes da expansão via harness da US4.
 * Não configura regra por API nem fabrica origem HISTORICA em um par novo.
 * O harness decide quais registros existem (histórico completo ou incompleto).
 */
export function dadosHistoricos100(): FixtureHistorica100 {
  return {
    totalPontos: "100.00",
    origemEsperadaAposAdocao: "HISTORICA",
    subgruposEsperados: [
      { nome: "Provas", orcamentoPontos: "60.00", modoQuantidade: "FIXA", quantidadeFixa: 3, ordem: 0 },
      { nome: "TPI", orcamentoPontos: "5.00", modoQuantidade: "FIXA", quantidadeFixa: 1, ordem: 1 },
      { nome: "Trabalhos", orcamentoPontos: "35.00", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 2 },
    ],
    avaliacoesRegulares: [
      { tipo: "PROVA", valor: "20.00" },
      { tipo: "PROVA", valor: "20.00" },
      { tipo: "PROVA", valor: "20.00" },
      { tipo: "TPI", valor: "5.00" },
      { tipo: "TRABALHO", valor: "35.00" },
    ],
    recuperacao: { tipo: "RECUPERACAO", valor: "100.00" },
  };
}
