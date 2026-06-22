import { NotaRepository } from "../../notas/repository/NotaRepository.js";
import { MatriculaService } from "../../modulo-matricula/service/MatriculaService.js";
import { AlunoService } from "../../modulo-gestao-alunos/service/AlunoService.js";
import { FrequenciaService } from "../../frequencia/service/FrequenciaService.js";
import { DocumentoService } from "../../modulo-documentos/service/DocumentoService.js";
import { PeriodoLetivoService } from "../../modulo-estrutura-academica/service/PeriodoLetivoService.js";

const NOTA_SITUACAO = (media: number) => {
  if (media >= 7) return "aprovado";
  if (media >= 5) return "recuperacao";
  return "reprovado";
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
        nota: (() => {
          const n = av.nota == null ? NaN : Number(av.nota);
          return Number.isFinite(n) ? n : 0;
        })(),
        peso: (() => {
          const p = av.valor == null ? NaN : Number(av.valor);
          return Number.isFinite(p) ? p : 0;
        })(),
        matricula_turma_disciplina_id: av.matricula_turma_disciplina_id ?? null,
      });
    }

    const notas = [] as any[];

    for (const [_, item] of notasPorDisciplinaMap.entries()) {
      const totalPeso = item.avaliacoes.reduce(
        (s: number, a: any) => s + (a.peso || 0),
        0,
      );
      const totalNota = item.avaliacoes.reduce(
        (s: number, a: any) => s + (a.nota || 0) * (a.peso || 0),
        0,
      );
      const media =
        totalPeso > 0 ? Number((totalNota / totalPeso).toFixed(1)) : 0;
      item.media = media;
      item.situacao = NOTA_SITUACAO(media);
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
