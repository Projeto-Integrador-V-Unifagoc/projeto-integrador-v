import type { Api } from "./api.js";
import { garantirLocal } from "./db.js";

/**
 * Operações de domínio reutilizadas por jornadas e specs: plano de avaliações de
 * 100 pontos, lançamento de notas em lote e registro de chamada de frequência
 * (spec §9, §10). Encapsular aqui mantém os specs focados nas asserções.
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

/** Cria um plano regular que totaliza exatamente 100 pontos (3×20 + 5 + 35). */
export async function criarPlano100(apiProfessor: Api, turmaDisciplinaId: string): Promise<Plano100> {
  const data = hojeSaoPaulo();
  const provas: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const resp = await apiProfessor.post("/avaliacoes", {
      body: {
        tipo_avaliacao: "PROVA",
        descricao_avaliacao: `Prova ${i}`,
        data_lancamento: data,
        valor: 20,
        turma_disciplina_id: turmaDisciplinaId,
      },
    });
    exigir(resp, "PROVA");
    provas.push(String(resp.body.id));
  }
  const tpi = await apiProfessor.post("/avaliacoes", {
    body: { tipo_avaliacao: "TPI", descricao_avaliacao: "TPI", data_lancamento: data, valor: 5, turma_disciplina_id: turmaDisciplinaId },
  });
  exigir(tpi, "TPI");
  const trabalho = await apiProfessor.post("/avaliacoes", {
    body: { tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Trabalho", data_lancamento: data, valor: 35, turma_disciplina_id: turmaDisciplinaId },
  });
  exigir(trabalho, "TRABALHO");

  return {
    provas,
    tpi: String(tpi.body.id),
    trabalho: String(trabalho.body.id),
    todas: [...provas, String(tpi.body.id), String(trabalho.body.id)],
  };
}

/** Lança a mesma nota para todos os alunos informados, em lote atômico. */
export async function lancarNotaLote(
  apiProfessor: Api,
  avaliacaoId: string,
  itens: Array<{ alunoId: string; valor: number }>,
) {
  const resp = await apiProfessor.put(`/notas/avaliacoes/${avaliacaoId}/lote`, { body: { itens } });
  return resp;
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
