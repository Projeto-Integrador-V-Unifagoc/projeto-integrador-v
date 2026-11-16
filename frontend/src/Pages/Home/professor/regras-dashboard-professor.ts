// Regras de negócio do dashboard do professor.
// O nível de risco vem do backend (HomeProfessorService.nivel) e é o mesmo do aluno:
// frequência < 75% = CRITICO (risco alto); média < 60% ou frequência ≤ 80% = ATENCAO (risco médio).
import type { NivelRiscoVisual } from "../../../components/DashboardLayout";
import type {
  AlunoProfessor,
  AtribuicaoProfessor,
  AvaliacaoPeriodoProfessor,
  ChamadaPendenteProfessor,
  NivelAtencaoProfessor,
} from "../../../models/home-professor-model";
import { diasAte } from "../../Agenda/agenda-utils";

export const MEDIA_REFERENCIA = 60;
export const FREQUENCIA_MINIMA = 75;
export const FREQUENCIA_LIMITROFE = 80;
export const MEDIA_CRITICA = 40;
export const JANELA_NOTAS_DIAS = 7;
export const TODAS = "todas";

export interface SelecaoProfessor {
  turmaId: string;
  disciplinaId: string;
}

export interface AlunoEmAtencao extends AlunoProfessor {
  chave: string;
  turmaDisciplinaId: string;
  disciplinaNome: string;
  turmaSigla: string;
}

export interface PendenciaLancamento {
  id: string;
  tipo: "notas" | "chamada";
  turmaDisciplinaId: string;
  titulo: string;
  disciplinaNome: string;
  turmaSigla: string;
  feitos: number;
  esperados: number;
  faltantes: number;
  data: string | null;
  vencida: boolean;
}

const ORDEM_NIVEL: NivelAtencaoProfessor[] = ["CRITICO", "ATENCAO", "REGULAR", "SEM_DADOS"];
const arred1 = (valor: number) => Math.round(valor * 10) / 10;
const media = (valores: number[]) => (valores.length ? arred1(valores.reduce((soma, valor) => soma + valor, 0) / valores.length) : null);

export const nivelVisual = (nivel: NivelAtencaoProfessor): NivelRiscoVisual =>
  nivel === "CRITICO" ? "alto" : nivel === "ATENCAO" ? "medio" : nivel === "REGULAR" ? "sem-risco" : "sem-dados";

export const emAtencao = (nivel: NivelAtencaoProfessor) => nivel === "CRITICO" || nivel === "ATENCAO";

/** Opções dos filtros, sem repetição e em ordem alfabética. */
export function opcoesFiltro(atribuicoes: AtribuicaoProfessor[]) {
  const turmas = new Map(atribuicoes.map((item) => [item.turma.id, item.turma.sigla]));
  const disciplinas = new Map(atribuicoes.map((item) => [item.disciplina.id, item.disciplina.nome]));
  const ordenar = (mapa: Map<string, string>) => [...mapa].map(([id, rotulo]) => ({ id, rotulo })).sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  return { turmas: ordenar(turmas), disciplinas: ordenar(disciplinas) };
}

/** Aplica os filtros de turma e disciplina às ofertas e aos dados ligados a elas. */
export function filtrarPorSelecao(
  dados: { atribuicoes: AtribuicaoProfessor[]; avaliacoes: AvaliacaoPeriodoProfessor[]; chamadas: ChamadaPendenteProfessor[] },
  selecao: SelecaoProfessor,
) {
  const atribuicoes = dados.atribuicoes.filter((item) =>
    (selecao.turmaId === TODAS || item.turma.id === selecao.turmaId) &&
    (selecao.disciplinaId === TODAS || item.disciplina.id === selecao.disciplinaId));
  const ofertas = new Set(atribuicoes.map((item) => item.id));
  return {
    atribuicoes,
    avaliacoes: dados.avaliacoes.filter((item) => ofertas.has(item.turmaDisciplinaId)),
    chamadas: dados.chamadas.filter((item) => ofertas.has(item.turmaDisciplinaId)),
  };
}

export function resumoIndicadores(atribuicoes: AtribuicaoProfessor[], avaliacoes: AvaliacaoPeriodoProfessor[]) {
  const alunos = atribuicoes.flatMap((item) => item.alunos ?? []);
  const alunosUnicos = new Set(alunos.map((item) => item.id));
  const atencao = new Set(alunos.filter((item) => emAtencao(item.nivel)).map((item) => item.id));
  const criticos = new Set(alunos.filter((item) => item.nivel === "CRITICO").map((item) => item.id));
  const vencidas = avaliacoes.filter((item) => item.vencida);
  const nomesDisciplinas = [...new Set(atribuicoes.map((item) => item.disciplina.nome))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return {
    turmas: new Set(atribuicoes.map((item) => item.turma.id)).size,
    disciplinas: nomesDisciplinas.length,
    nomesDisciplinas,
    ofertas: atribuicoes.length,
    alunosUnicos: alunosUnicos.size,
    alunosEmAtencao: atencao.size,
    alunosCriticos: criticos.size,
    percentualAtencao: alunosUnicos.size ? arred1((atencao.size / alunosUnicos.size) * 100) : null,
    possuiCritico: alunos.some((item) => item.nivel === "CRITICO"),
    avaliacoesComNotasFaltantes: vencidas.length,
    notasFaltantes: vencidas.reduce((soma, item) => soma + Math.max(item.notasEsperadas - item.notasLancadas, 0), 0),
  };
}

/** Pares aluno + oferta em atenção: risco alto, depois médio, depois a menor média. */
export function listarAlunosEmAtencao(atribuicoes: AtribuicaoProfessor[]): AlunoEmAtencao[] {
  return atribuicoes
    .flatMap((oferta) => (oferta.alunos ?? [])
      .filter((aluno) => emAtencao(aluno.nivel))
      .map((aluno) => ({
        ...aluno,
        chave: `${oferta.id}-${aluno.id}`,
        turmaDisciplinaId: oferta.id,
        disciplinaNome: oferta.disciplina.nome,
        turmaSigla: oferta.turma.sigla,
      })))
    .sort((a, b) =>
      ORDEM_NIVEL.indexOf(a.nivel) - ORDEM_NIVEL.indexOf(b.nivel) ||
      (a.media ?? Number.POSITIVE_INFINITY) - (b.media ?? Number.POSITIVE_INFINITY) ||
      a.nome.localeCompare(b.nome, "pt-BR"));
}

const TIPOS_APROVEITAMENTO = [
  { tipo: "PROVA", rotulo: "Provas" },
  { tipo: "TRABALHO", rotulo: "Trabalhos" },
  { tipo: "TPI", rotulo: "TPI" },
];

export function calcularAproveitamento(atribuicoes: AtribuicaoProfessor[], avaliacoes: AvaliacaoPeriodoProfessor[]) {
  const vinculos = atribuicoes.flatMap((item) => item.alunos ?? []);

  // Média de cada aluno = média das suas médias nas ofertas filtradas.
  const mediasPorAluno = new Map<string, number[]>();
  for (const aluno of vinculos) {
    if (aluno.media === null) continue;
    mediasPorAluno.set(aluno.id, [...(mediasPorAluno.get(aluno.id) ?? []), aluno.media]);
  }
  const mediasAlunos = [...mediasPorAluno.values()].map((valores) => media(valores) as number);
  const mediaGeral = media(mediasAlunos);
  const alunosAcimaReferencia = mediasAlunos.filter((valor) => valor >= MEDIA_REFERENCIA).length;

  const porTipo = TIPOS_APROVEITAMENTO.map(({ tipo, rotulo }) => {
    const doTipo = avaliacoes.filter((item) => item.tipo === tipo && item.mediaPercentual !== null && item.notasLancadas > 0);
    const pesos = doTipo.reduce((soma, item) => soma + item.notasLancadas, 0);
    const valor = pesos ? arred1(doTipo.reduce((soma, item) => soma + (item.mediaPercentual as number) * item.notasLancadas, 0) / pesos) : null;
    return { tipo, rotulo, media: valor };
  }).filter((item) => item.media !== null);

  return {
    mediaGeral,
    escala10: mediaGeral === null ? null : arred1(mediaGeral / 10),
    alunosComNota: mediasAlunos.length,
    alunosAcimaReferencia,
    percentualAcimaReferencia: mediasAlunos.length ? arred1((alunosAcimaReferencia / mediasAlunos.length) * 100) : null,
    porTipo,
    frequenciaAgregada: media(vinculos.map((item) => item.frequencia).filter((valor): valor is number => valor !== null)),
  };
}

/**
 * Pendências reais de lançamento:
 * - notas: avaliação com notas incompletas e devolução vencida ou nos próximos 7 dias;
 * - chamada: aula já cadastrada com registro faltando para algum aluno ativo.
 * Ordem: notas vencidas, chamadas (mais antigas primeiro), notas que vencem em breve.
 */
export function listarPendencias(
  avaliacoes: AvaliacaoPeriodoProfessor[],
  chamadas: ChamadaPendenteProfessor[],
  atribuicoes: AtribuicaoProfessor[],
  hoje = new Date(),
): PendenciaLancamento[] {
  const ofertas = new Map(atribuicoes.map((item) => [item.id, item]));
  const contexto = (turmaDisciplinaId: string) => {
    const oferta = ofertas.get(turmaDisciplinaId);
    return { disciplinaNome: oferta?.disciplina.nome ?? "Disciplina", turmaSigla: oferta?.turma.sigla ?? "—" };
  };

  const notas = avaliacoes
    .filter((item) => item.notasEsperadas > 0 && item.notasLancadas < item.notasEsperadas)
    .filter((item) => item.vencida || (item.dataDevolucao !== null && diasAte(item.dataDevolucao, hoje) >= 0 && diasAte(item.dataDevolucao, hoje) <= JANELA_NOTAS_DIAS))
    .map((item): PendenciaLancamento => ({
      id: `notas-${item.id}`,
      tipo: "notas",
      turmaDisciplinaId: item.turmaDisciplinaId,
      titulo: item.titulo,
      ...contexto(item.turmaDisciplinaId),
      feitos: item.notasLancadas,
      esperados: item.notasEsperadas,
      faltantes: item.notasEsperadas - item.notasLancadas,
      data: item.dataDevolucao,
      vencida: item.vencida,
    }));

  const chamadasPendentes = chamadas
    .filter((item) => item.registrados < item.esperados)
    .map((item): PendenciaLancamento => ({
      id: `chamada-${item.aulaId}`,
      tipo: "chamada",
      turmaDisciplinaId: item.turmaDisciplinaId,
      titulo: "Chamada",
      ...contexto(item.turmaDisciplinaId),
      feitos: item.registrados,
      esperados: item.esperados,
      faltantes: item.esperados - item.registrados,
      data: item.data,
      vencida: false,
    }));

  const porData = (a: PendenciaLancamento, b: PendenciaLancamento) => (a.data ?? "").localeCompare(b.data ?? "");
  return [
    ...notas.filter((item) => item.vencida).sort(porData),
    ...chamadasPendentes.sort(porData),
    ...notas.filter((item) => !item.vencida).sort(porData),
  ];
}

const ROTULO_NIVEL: Record<NivelAtencaoProfessor, string> = { CRITICO: "Risco alto", ATENCAO: "Risco médio", REGULAR: "Sem risco", SEM_DADOS: "Sem dados" };

/** CSV (separador ";", padrão do Excel em pt-BR) com os alunos das ofertas filtradas. */
export function gerarCsvAlunos(atribuicoes: AtribuicaoProfessor[]) {
  const celula = (valor: unknown) => {
    const texto = valor === null || valor === undefined ? "" : String(valor);
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const numero = (valor: number | null) => (valor === null ? "" : String(valor).replace(".", ","));
  const linhas = [["Aluno", "Matrícula", "Disciplina", "Turma", "Média (%)", "Frequência (%)", "Risco", "Motivo"]];
  for (const oferta of atribuicoes) {
    for (const aluno of oferta.alunos ?? []) {
      linhas.push([aluno.nome, String(aluno.matricula), oferta.disciplina.nome, oferta.turma.sigla, numero(aluno.media), numero(aluno.frequencia), ROTULO_NIVEL[aluno.nivel], aluno.motivo]);
    }
  }
  return linhas.map((linha) => linha.map(celula).join(";")).join("\n");
}
