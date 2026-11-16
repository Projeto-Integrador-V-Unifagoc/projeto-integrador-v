// Regras de negócio do dashboard do aluno.
// Referências do Regimento usadas pelo sistema: frequência mínima de 75% e média de referência de 60%.
// O nível de risco segue a mesma regra do backend do professor (HomeProfessorService.nivel):
// frequência < 75% = alto; média < 60% ou frequência ≤ 80% = médio.
import type { MinhaFrequenciaAluno } from "../../../models/frequencia-model";
import type { DisciplinaAluno } from "../../../models/home-aluno-model";
import type { BoletimAluno, TipoAvaliacaoNota } from "../../../models/nota-model";
import { diasAte } from "../../Agenda/agenda-utils";
import { formatarDataPtBr } from "../../../utils/avaliacao";
import { FREQUENCIA_LIMITROFE, FREQUENCIA_MINIMA, MEDIA_CRITICA, MEDIA_REFERENCIA } from "../../../utils/criterios-academicos";

export { FREQUENCIA_LIMITROFE, FREQUENCIA_MINIMA, MEDIA_CRITICA, MEDIA_REFERENCIA };
export const JANELA_DEVOLUCAO_DIAS = 15;
export const JANELA_PRAZO_DIAS = 7;
export const MAX_PONTOS_ATENCAO = 5;

export type NivelRisco = "alto" | "medio" | "sem-dados" | "sem-risco";

export interface DisciplinaPainel {
  turmaDisciplinaId: string;
  codigo: string;
  nome: string;
  professorNome: string;
  media: number | null;
  frequencia: number | null;
  presencas: number;
  faltas: number;
  aulasRegistradas: number;
  nivel: NivelRisco;
  motivos: string[];
}

export interface AvaliacaoPainel {
  id: string;
  turmaDisciplinaId: string;
  titulo: string;
  tipo: TipoAvaliacaoNota;
  disciplinaNome: string;
  valorMaximo: number;
  lancada: boolean;
  dataDevolucao: string | null;
  /** Dias até a devolução (negativo = já passou); null sem data. */
  diasParaDevolucao: number | null;
  devolucaoVencida: boolean;
}

export type GravidadePonto = "alta" | "media" | "info";

export interface PontoAtencao {
  id: string;
  turmaDisciplinaId: string;
  gravidade: GravidadePonto;
  titulo: string;
  selo: string;
  descricao: string;
}

const ORDEM_RISCO: NivelRisco[] = ["alto", "medio", "sem-dados", "sem-risco"];
const ORDEM_GRAVIDADE: GravidadePonto[] = ["alta", "media", "info"];
const ROTULO_TIPO: Record<TipoAvaliacaoNota, string> = { PROVA: "Prova", TPI: "TPI", TRABALHO: "Trabalho", RECUPERACAO: "Recuperação" };

const arred1 = (valor: number) => Math.round(valor * 10) / 10;
export const fmtPct = (valor: number | null, casas = 0) =>
  valor === null ? "—" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(valor)}%`;
const fmtPp = (valor: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Math.abs(arred1(valor)))} p.p.`;
const dataCurta = (iso: string) => formatarDataPtBr(iso).slice(0, 5);

/**
 * Classifica o risco de uma disciplina; o risco mais grave define o nível.
 * Alto: frequência < 75%. Médio: média < 60% ou frequência ≤ 80%.
 */
export function classificarRiscoDisciplina(media: number | null, frequencia: number | null): { nivel: NivelRisco; motivos: string[] } {
  const altos: string[] = [];
  const medios: string[] = [];
  if (frequencia !== null) {
    if (frequencia < FREQUENCIA_MINIMA) altos.push("Frequência abaixo do mínimo de 75%");
    else if (frequencia <= FREQUENCIA_LIMITROFE) medios.push("Frequência próxima do mínimo de 75%");
  }
  if (media !== null && media < MEDIA_REFERENCIA) medios.push("Média parcial abaixo da referência de 60%");
  if (altos.length) return { nivel: "alto", motivos: [...altos, ...medios] };
  if (medios.length) return { nivel: "medio", motivos: medios };
  if (media === null && frequencia === null) return { nivel: "sem-dados", motivos: ["Aguardando lançamentos"] };
  return { nivel: "sem-risco", motivos: ["Dentro das metas"] };
}

/** Junta disciplinas, boletim e frequência; ordena por risco e depois pelo nome. */
export function montarDisciplinasAluno(
  disciplinas: DisciplinaAluno[],
  boletim: BoletimAluno | null,
  frequencia: MinhaFrequenciaAluno | null,
): DisciplinaPainel[] {
  const notas = new Map((boletim?.disciplinas ?? []).map((item) => [item.turmaDisciplinaId, item]));
  const freqs = new Map((frequencia?.consolidado ?? []).map((item) => [item.turmaDisciplinaId, item]));

  return disciplinas
    .map((disciplina) => {
      const nota = notas.get(disciplina.turmaDisciplinaId);
      const freq = freqs.get(disciplina.turmaDisciplinaId);
      const presencas = freq?.presencas ?? 0;
      const faltas = freq?.faltas ?? 0;
      const registradas = presencas + faltas;
      const frequenciaAtual = registradas > 0 ? arred1((presencas / registradas) * 100) : null;
      const media = nota?.mediaFinal ?? nota?.mediaParcial ?? null;
      return {
        turmaDisciplinaId: disciplina.turmaDisciplinaId,
        codigo: disciplina.codigo,
        nome: disciplina.nome,
        professorNome: disciplina.professorNome,
        media,
        frequencia: frequenciaAtual,
        presencas,
        faltas,
        aulasRegistradas: registradas,
        ...classificarRiscoDisciplina(media, frequenciaAtual),
      };
    })
    .sort((a, b) => ORDEM_RISCO.indexOf(a.nivel) - ORDEM_RISCO.indexOf(b.nivel) || a.nome.localeCompare(b.nome, "pt-BR"));
}

export function resumoMedia(disciplinas: DisciplinaPainel[]) {
  const medias = disciplinas.map((item) => item.media).filter((item): item is number => item !== null);
  const media = medias.length ? arred1(medias.reduce((soma, valor) => soma + valor, 0) / medias.length) : null;
  return { media, disciplinasComNota: medias.length, escala10: media === null ? null : arred1(media / 10) };
}

export function resumoFrequencia(disciplinas: DisciplinaPainel[]) {
  const presencas = disciplinas.reduce((soma, item) => soma + item.presencas, 0);
  const faltas = disciplinas.reduce((soma, item) => soma + item.faltas, 0);
  const total = presencas + faltas;
  const percentual = total > 0 ? arred1((presencas / total) * 100) : null;
  const situacao: "ok" | "atencao" | "abaixo" | "sem-dados" =
    percentual === null ? "sem-dados" : percentual < FREQUENCIA_MINIMA ? "abaixo" : percentual < FREQUENCIA_LIMITROFE ? "atencao" : "ok";
  return { presencas, faltas, percentual, situacao, diferencaMinimo: percentual === null ? null : arred1(percentual - FREQUENCIA_MINIMA) };
}

/** "A, B +2": lista curta de nomes para textos de apoio (o resto fica nos blocos de detalhe). */
export function resumirNomes(nomes: string[], maximo = 2) {
  if (nomes.length <= maximo) return nomes.join(", ");
  return `${nomes.slice(0, maximo).join(", ")} +${nomes.length - maximo}`;
}

/** "1 alto · 2 médio": contagem de risco das disciplinas em atenção. */
export function resumoNiveis(disciplinas: DisciplinaPainel[]) {
  const altos = disciplinas.filter((item) => item.nivel === "alto").length;
  const medios = disciplinas.filter((item) => item.nivel === "medio").length;
  return [altos ? `${altos} alto` : null, medios ? `${medios} médio` : null].filter(Boolean).join(" · ");
}

export function resumoAtencao(disciplinas: DisciplinaPainel[]) {
  const emAtencao = disciplinas.filter((item) => item.nivel === "alto" || item.nivel === "medio");
  const piorNivel: NivelRisco | null = emAtencao.some((item) => item.nivel === "alto") ? "alto" : emAtencao.length ? "medio" : null;
  return { emAtencao, piorNivel };
}

/** Todas as avaliações do boletim com a situação de devolução calculada. */
export function listarAvaliacoesPainel(boletim: BoletimAluno | null, hoje = new Date()): AvaliacaoPainel[] {
  const itens = (boletim?.disciplinas ?? []).flatMap((disciplina) =>
    disciplina.avaliacoes.map((avaliacao) => {
      const dataDevolucao = avaliacao.dataDevolucao ?? null;
      const dias = dataDevolucao ? diasAte(dataDevolucao, hoje) : null;
      return {
        id: avaliacao.id,
        turmaDisciplinaId: disciplina.turmaDisciplinaId,
        titulo: avaliacao.descricao?.trim() || ROTULO_TIPO[avaliacao.tipo] || avaliacao.tipo,
        tipo: avaliacao.tipo,
        disciplinaNome: disciplina.disciplinaNome,
        valorMaximo: avaliacao.valorMaximo,
        lancada: avaliacao.lancada,
        dataDevolucao,
        diasParaDevolucao: dias,
        devolucaoVencida: !avaliacao.lancada && dias !== null && dias < 0,
      };
    }),
  );

  // 1) devoluções vencidas sem nota; 2) próximas devoluções (mais perto primeiro);
  // 3) já lançadas (mais recentes primeiro); sem data por último em cada grupo.
  const grupo = (item: AvaliacaoPainel) => (item.devolucaoVencida ? 0 : !item.lancada ? 1 : 2);
  return itens.sort((a, b) => {
    const diferencaGrupo = grupo(a) - grupo(b);
    if (diferencaGrupo) return diferencaGrupo;
    const da = a.diasParaDevolucao ?? Number.POSITIVE_INFINITY;
    const db = b.diasParaDevolucao ?? Number.POSITIVE_INFINITY;
    if (grupo(a) === 2) return (b.diasParaDevolucao ?? Number.NEGATIVE_INFINITY) - (a.diasParaDevolucao ?? Number.NEGATIVE_INFINITY);
    return da - db;
  });
}

export function resumoDevolucoes(avaliacoes: AvaliacaoPainel[]) {
  const proximas = avaliacoes.filter((item) => item.diasParaDevolucao !== null && item.diasParaDevolucao >= 0 && item.diasParaDevolucao <= JANELA_DEVOLUCAO_DIAS);
  const vencidas = avaliacoes.filter((item) => item.devolucaoVencida);
  const lancadas = avaliacoes.filter((item) => item.lancada).length;
  // Sem nota e ainda no prazo (ou sem data de devolução): não confundir com as vencidas.
  const aguardando = avaliacoes.length - lancadas - vencidas.length;
  return { proximas, vencidas, total: avaliacoes.length, lancadas, aguardando };
}

/** Faltas que ainda cabem sem cair abaixo de 75%, considerando as aulas já registradas. */
export function faltasRestantes(aulasRegistradas: number, faltas: number) {
  return Math.max(0, Math.floor(aulasRegistradas * (1 - FREQUENCIA_MINIMA / 100)) - faltas);
}

/** Pontos de atenção gerados pelas regras do Regimento, do mais grave para o menos grave. */
export function gerarPontosAtencao(disciplinas: DisciplinaPainel[], avaliacoes: AvaliacaoPainel[]): PontoAtencao[] {
  const pontos: PontoAtencao[] = [];

  for (const d of disciplinas) {
    if (d.frequencia !== null && d.frequencia < FREQUENCIA_MINIMA) {
      pontos.push({
        id: `freq-baixa-${d.turmaDisciplinaId}`,
        turmaDisciplinaId: d.turmaDisciplinaId,
        gravidade: "alta",
        titulo: `Frequência abaixo do mínimo: ${d.nome}`,
        selo: `${fmtPct(d.frequencia, 1)} (mín. 75%)`,
        descricao: `${d.faltas} ${d.faltas === 1 ? "falta" : "faltas"} em ${d.aulasRegistradas} aulas registradas.`,
      });
    } else if (d.frequencia !== null && d.frequencia <= FREQUENCIA_LIMITROFE) {
      const restantes = faltasRestantes(d.aulasRegistradas, d.faltas);
      pontos.push({
        id: `freq-limite-${d.turmaDisciplinaId}`,
        turmaDisciplinaId: d.turmaDisciplinaId,
        gravidade: "media",
        titulo: `Frequência limítrofe: ${d.nome}`,
        selo: `${fmtPct(d.frequencia, 1)} (mín. 75%)`,
        descricao: `${d.faltas} ${d.faltas === 1 ? "falta" : "faltas"} · ${restantes === 0 ? "nenhuma falta a mais cabe" : `cabe${restantes === 1 ? "" : "m"} mais ${restantes}`} até o mínimo.`,
      });
    }

    if (d.media !== null && d.media < MEDIA_REFERENCIA) {
      pontos.push({
        id: `media-baixa-${d.turmaDisciplinaId}`,
        turmaDisciplinaId: d.turmaDisciplinaId,
        gravidade: d.media < MEDIA_CRITICA ? "alta" : "media",
        titulo: `Média abaixo da referência: ${d.nome}`,
        selo: `${fmtPct(d.media, 1)} (ref. 60%)`,
        descricao: `Faltam ${fmtPp(MEDIA_REFERENCIA - d.media)} para a referência.`,
      });
    }
  }

  for (const a of avaliacoes) {
    if (a.lancada || a.dataDevolucao === null || a.diasParaDevolucao === null) continue;
    if (a.devolucaoVencida) {
      pontos.push({
        id: `devolucao-vencida-${a.id}`,
        turmaDisciplinaId: a.turmaDisciplinaId,
        gravidade: "media",
        titulo: `Nota não publicada: ${a.titulo}`,
        selo: `Devolução ${dataCurta(a.dataDevolucao)}`,
        descricao: `${a.disciplinaNome} · a data de devolução já passou.`,
      });
    } else if (a.diasParaDevolucao <= JANELA_PRAZO_DIAS) {
      pontos.push({
        id: `prazo-${a.id}`,
        turmaDisciplinaId: a.turmaDisciplinaId,
        gravidade: "info",
        titulo: `Prazo de devolução: ${a.titulo}`,
        selo: `Devolução ${dataCurta(a.dataDevolucao)}`,
        descricao: `${a.disciplinaNome} · acompanhe a publicação da nota.`,
      });
    }
  }

  return pontos.sort((a, b) => ORDEM_GRAVIDADE.indexOf(a.gravidade) - ORDEM_GRAVIDADE.indexOf(b.gravidade));
}
