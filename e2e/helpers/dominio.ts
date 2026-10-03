import type { Api } from "./api.js";
import { garantirLocal } from "./db.js";

/**
 * Operações de fixture reutilizadas por jornadas: plano regular explicitamente
 * configurado, notas textuais e chamada completa de frequência. Nenhum helper
 * decide corte, recuperação ou aprovação acadêmica.
 */

const hojeSaoPaulo = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

/** Datas YYYY-MM-DD recentes (passado), determinísticas, no fuso de São Paulo. */
export function datasRecentes(quantidade: number): string[] {
  const datas: string[] = [];
  for (let i = 1; i <= quantidade; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    datas.push(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d),
    );
  }
  return datas;
}

export interface Plano100 {
  provas: string[];
  tpi: string;
  trabalho: string;
  todas: string[];
}

export interface PlanoRegular {
  avaliacoes: Array<{ id: string; maximo: string; subgrupoId: string }>;
}

interface PlanoFixture {
  totalPontos: string;
  subgrupos: Array<{ id: string; nome: string; orcamentoPontos: string;
    modoQuantidade: "FIXA" | "SEM_LIMITE"; quantidadeFixa: number | null }>;
}

const centesimosFixture = (texto: string): bigint => {
  if (typeof texto !== "string" || !/^\d+\.\d{2}$/.test(texto)) throw new Error("A fixture exige pontos textuais com duas casas.");
  const [inteiro, fracao] = texto.split(".");
  return BigInt(inteiro) * 100n + BigInt(fracao);
};
const decimalFixture = (pontos: bigint): string => `${pontos / 100n}.${String(pontos % 100n).padStart(2, "0")}`;

async function carregarPlanoFixture(apiProfessor: Api, turmaDisciplinaId: string): Promise<PlanoFixture> {
  const resposta = await apiProfessor.get(`/avaliacoes/plano/${turmaDisciplinaId}`);
  if (resposta.status !== 200 || !resposta.body.regraPontuacaoId) throw new Error("Configure a regra explícita antes da fixture de avaliações.");
  return resposta.body;
}

function definirRegulares(plano: PlanoFixture) {
  return plano.subgrupos.flatMap((grupo) => {
    const quantidade = grupo.modoQuantidade === "FIXA" ? grupo.quantidadeFixa : 1;
    if (quantidade === null || !Number.isInteger(quantidade) || quantidade < 1) throw new Error("Quantidade inválida na fixture regular.");
    const orcamento = centesimosFixture(grupo.orcamentoPontos);
    if (orcamento < BigInt(quantidade)) throw new Error("Orçamento da fixture não permite máximos positivos.");
    const base = orcamento / BigInt(quantidade);
    return Array.from({ length: quantidade }, (_, indice) => ({
      descricao: `${grupo.nome} ${indice + 1}`, subgrupoId: grupo.id,
      maximo: decimalFixture(indice === quantidade - 1 ? orcamento - base * BigInt(indice) : base),
    }));
  });
}

async function criarRegulares(apiProfessor: Api, turmaDisciplinaId: string, definicoes: ReturnType<typeof definirRegulares>): Promise<PlanoRegular> {
  const avaliacoes: PlanoRegular["avaliacoes"] = [];
  for (const definicao of definicoes) {
    const criada = await apiProfessor.post("/avaliacoes", { body: {
      turma_disciplina_id: turmaDisciplinaId, tipo_avaliacao: "REGULAR", subgrupo_id: definicao.subgrupoId,
      descricao_avaliacao: definicao.descricao, data_lancamento: hojeSaoPaulo(), valor: definicao.maximo,
    } });
    exigir(criada, "REGULAR");
    avaliacoes.push({ id: String(criada.body.id), maximo: definicao.maximo, subgrupoId: definicao.subgrupoId });
  }
  return { avaliacoes };
}

/** Fixture explícita; orçamento/quantidade vêm da configuração efetivamente criada. */
export async function criarPlanoRegular(apiProfessor: Api, turmaDisciplinaId: string): Promise<PlanoRegular> {
  const plano = await carregarPlanoFixture(apiProfessor, turmaDisciplinaId);
  return criarRegulares(apiProfessor, turmaDisciplinaId, definirRegulares(plano));
}

/** Cria um plano regular que totaliza exatamente 100 pontos (3×20 + 5 + 35). */
export async function criarPlano100(apiProfessor: Api, turmaDisciplinaId: string): Promise<Plano100> {
  const configuracao = await carregarPlanoFixture(apiProfessor, turmaDisciplinaId);
  const definicoes = definirRegulares(configuracao);
  const composicao = configuracao.subgrupos.map((g) => [g.orcamentoPontos, g.modoQuantidade, g.quantidadeFixa]);
  if (configuracao.totalPontos !== "100.00" || JSON.stringify(composicao) !== JSON.stringify([
    ["60.00", "FIXA", 3], ["5.00", "FIXA", 1], ["35.00", "SEM_LIMITE", null],
  ]) || definicoes.map((a) => a.maximo).join() !== "20.00,20.00,20.00,5.00,35.00") {
    throw new Error("A fixture criarPlano100 exige configuração explícita100/60-fixa3/5-fixa1/35-sem limite.");
  }
  const plano = await criarRegulares(apiProfessor, turmaDisciplinaId, definicoes);
  const ids = plano.avaliacoes.map((a) => a.id);
  return { provas: ids.slice(0, 3), tpi: ids[3], trabalho: ids[4], todas: ids };
}

/** Lança a mesma nota para todos os alunos informados, em lote atômico. */
export async function lancarNotaLote(
  apiProfessor: Api,
  avaliacaoId: string,
  itens: Array<{ alunoId: string; valor: string }>,
) {
  if (itens.some((i) => typeof i.valor !== "string")) throw new Error("Fixture de nota exige pontos textuais explícitos.");
  const resp = await apiProfessor.put(`/notas/avaliacoes/${avaliacaoId}/lote`, { body: { itens } });
  return resp;
}

/** Distribui apenas os pontos solicitados no setup; não calcula resultado acadêmico. */
export async function lancarPontosRegulares(apiProfessor: Api, plano: PlanoRegular, alunoId: string, pontos: string) {
  let restante = centesimosFixture(pontos);
  const itens = plano.avaliacoes.map((avaliacao) => {
    const maximo = centesimosFixture(avaliacao.maximo);
    const valor = restante < maximo ? restante : maximo;
    restante -= valor;
    return { avaliacaoId: avaliacao.id, valor: decimalFixture(valor) };
  });
  if (restante !== 0n) throw new Error("Os pontos da fixture excedem o plano regular.");
  for (const item of itens) {
    const resposta = await lancarNotaLote(apiProfessor, item.avaliacaoId, [{ alunoId, valor: item.valor }]);
    if (resposta.status !== 200) throw new Error(`Falha ao lançar fixture regular: HTTP ${resposta.status}.`);
  }
  return itens;
}

/** Chamada completa dos alunos da fixture; devolve registros para justificar ausência. */
export async function registrarFrequenciaCompleta(apiProfessor: Api, turmaDisciplinaId: string, alunoIds: string[], presencas: number, faltas: number) {
  const registros: Array<{ id: string; alunoId: string; status: "PRESENTE" | "AUSENTE" }> = [];
  for (const [indice, data] of datasRecentes(presencas + faltas).entries()) {
    const resposta = await registrarChamada(apiProfessor, turmaDisciplinaId, data,
      alunoIds.map((alunoId) => ({ alunoId, status: indice < presencas ? "PRESENTE" : "AUSENTE" })), `E2E-${turmaDisciplinaId}`);
    if (![200, 201].includes(resposta.status)) throw new Error(`Falha ao registrar fixture de frequência: HTTP ${resposta.status}.`);
    registros.push(...resposta.body.registros);
  }
  return registros;
}

/** Lê a grade de lançamento de uma avaliação (inclui valorMaximo). */
export async function obterLancamento(apiProfessor: Api, avaliacaoId: string) {
  return apiProfessor.get(`/notas/avaliacoes/${avaliacaoId}/lancamento`);
}

/** Registra uma chamada completa para uma data, criando o local se necessário. */
export async function registrarChamada(
  apiProfessor: Api,
  turmaDisciplinaId: string,
  data: string,
  registros: Array<{ alunoId: string; status: "PRESENTE" | "AUSENTE" }>,
  localCodigo = "E2E-LOCAL",
) {
  const localId = await garantirLocal(localCodigo);
  return apiProfessor.post("/frequencias", {
    body: { turmaDisciplinaId, data, localId, registros },
  });
}

function exigir(resp: { status: number; body: any }, rotulo: string) {
  if (resp.status !== 201) {
    throw new Error(`Falha ao criar avaliação ${rotulo}: HTTP ${resp.status} — ${JSON.stringify(resp.body)}`);
  }
}
