import { NotaRepository } from "../../notas/repository/NotaRepository.js";
import { MatriculaService } from "../../modulo-matricula/service/MatriculaService.js";
import { AlunoService } from "../../modulo-gestao-alunos/service/AlunoService.js";
import { FrequenciaService } from "../../frequencia/service/FrequenciaService.js";
import { DocumentoService } from "../../modulo-documentos/service/DocumentoService.js";
import { PeriodoLetivoService } from "../../modulo-estrutura-academica/service/PeriodoLetivoService.js";
import { calcularBoletim, type AvaliacaoResumo } from "../../notas/models/Nota.js";

// Mapeia a situação canônica (regra §9, escala 0–100, aprovação >= 60) para o
// vocabulário exibido na ficha. Substitui a regra legada 0–10 (defeito §17.1).
const SITUACAO_FICHA: Record<string, string> = {
  APROVADO: "aprovado",
  REPROVADO: "reprovado",
  EM_RECUPERACAO: "recuperacao",
  EM_ANDAMENTO: "em_andamento",
  NAO_LANCADA: "nao_lancada",
};

export class FichaService {
  private matriculaService = new MatriculaService();
  private documentoService = new DocumentoService();
  private periodoService = new PeriodoLetivoService();
  private alunoService = new AlunoService();
  private frequenciaService = new FrequenciaService();
  private notaRepository = new NotaRepository();

  async montarFicha(alunoId: string) {
    const aluno = await this.alunoService.buscarAlunoPorId(alunoId);
    const matriculas = await this.matriculaService.listarPorAluno(alunoId);
    const frequencia = await this.frequenciaService
      .consultarAlunoInterno(alunoId)
      .catch(() => undefined);
    const documentos = await this.documentoService
      .listarPorAluno(alunoId)
      .catch(() => []);
    const periodos = await this.periodoService
      .listarPeriodosLetivos()
      .catch(() => []);

    const mtdIds = (
      matriculas
        .map((m: any) => m.matricula_turma_disciplina_id)
        .filter(Boolean) as string[]
    ).filter(Boolean);

    const avaliacoes = await this.notaRepository
      .buscarAvaliacoesParaFicha(mtdIds)
      .catch(() => []);

    // Agrupar avaliacoes por disciplina
    const notasPorDisciplinaMap = new Map<string, any>();

    for (const av of avaliacoes) {
      // Prefer a stable disciplina identifier when grouping evaluations.
      // Use a composite key to avoid collisions: disciplina_id (if present) + turma_disciplina_id,
      // otherwise fall back to disciplina_nome + turma_disciplina_id, then other fallbacks.
      const disciplinaPart =
        av.disciplina_id || av.disciplina_nome || "unknown_disc";
      const turmaPart =
        av.turma_disciplina_id ||
        av.turma_id ||
        av.turma_sigla ||
        av.turma_descricao ||
        av.id;
      const key = `${disciplinaPart}::${turmaPart}`;
      if (!notasPorDisciplinaMap.has(key)) {
        notasPorDisciplinaMap.set(key, {
          id: `nota-${key}`,
          alunoId: alunoId,
          alunoNome: aluno?.pessoa?.nome ?? null,
          turmaId: av.turma_id ?? null,
          turmaNome: av.turma_sigla ?? av.turma_descricao ?? null,
          disciplinaId: av.disciplina_id ?? null,
          disciplinaNome: av.disciplina_nome ?? null,
          professorId: av.professor_id ?? null,
          professorNome: av.professor_nome ?? null,
          periodoLetivo: null,
          avaliacoes: [],
          media: 0,
          situacao: "",
        });
      }

      const entry = notasPorDisciplinaMap.get(key);
      // if avaliacao references a matricula_turma_disciplina, try to fill periodoLetivo
      try {
        if (av.matricula_turma_disciplina_id && !entry.periodoLetivo) {
          const matriculaMatch = matriculas.find(
            (m: any) =>
              m.matricula_turma_disciplina_id ===
              av.matricula_turma_disciplina_id,
          );
          if (matriculaMatch) {
            entry.periodoLetivo =
              matriculaMatch.periodo_codigo ?? matriculaMatch.semestre ?? null;
          }
        }
      } catch (e) {
        // ignore
      }
      entry.avaliacoes.push({
        id: av.id,
        nome: av.descricao_avaliacao || av.tipo_avaliacao,
        tipo: av.tipo_avaliacao,
        // `nota` é null quando ainda não lançada — distinção necessária para a
        // regra §9 (apenas avaliações com nota entram no denominador).
        nota: av.nota == null ? null : Number(av.nota),
        peso: (() => {
          const p = av.valor == null ? NaN : Number(av.valor);
          return Number.isFinite(p) ? p : 0;
        })(),
        matricula_turma_disciplina_id: av.matricula_turma_disciplina_id ?? null,
      });
    }

    const notas = [] as any[];

    for (const [_, item] of notasPorDisciplinaMap.entries()) {
      // Regra institucional única (spec §9): média percentual dos pontos obtidos
      // sobre os pontos máximos das avaliações regulares lançadas; situação
      // derivada do mesmo cálculo usado por notas/boletim/rendimento.
      const avaliacoesResumo: AvaliacaoResumo[] = item.avaliacoes.map((a: any) => ({
        id: a.id,
        tipo: a.tipo,
        descricao: a.nome ?? null,
        valor: Number(a.peso) || 0,
      }));
      const notasPorAvaliacao = new Map<string, number>();
      for (const a of item.avaliacoes) {
        if (a.nota !== null && a.nota !== undefined) {
          notasPorAvaliacao.set(a.id, Number(a.nota));
        }
      }
      const boletim = calcularBoletim(avaliacoesResumo, notasPorAvaliacao);
      item.media = boletim.mediaFinal ?? boletim.mediaParcial ?? 0;
      item.situacao = SITUACAO_FICHA[boletim.situacao] ?? "em_andamento";
      notas.push(item);
    }

    return {
      aluno,
      matriculas,
      notas,
      frequencia,
      documentos,
      periodos,
    };
  }
}
