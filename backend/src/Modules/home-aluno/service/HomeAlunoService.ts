import type { Request } from "express";
import { calcularDesempenhoCompetencias, CRITERIOS_COMPETENCIA } from "../../competencias/domain/desempenhoCompetencia.js";
import { erroHomeAluno } from "../errors/HomeAlunoError.js";
import { HomeAlunoRepository } from "../repository/HomeAlunoRepository.js";
import { ROTULO_POR_TIPO, type DesempenhoCompetenciaAluno, type DesempenhoCompetenciasAluno, type DisciplinaAluno, type TarefaAluno, type TipoTarefa } from "../models/HomeAluno.js";

interface ContextoAluno {
  usuarioId: string;
  alunoId: string;
}

export class HomeAlunoService {
  constructor(private repository = new HomeAlunoRepository()) {}

  // GET /me/disciplinas — disciplinas do aluno no período letivo corrente.
  async minhasDisciplinas(req: Request): Promise<DisciplinaAluno[]> {
    const ctx = await this.obterContextoAluno(req);
    const linhas = await this.repository.listarDisciplinasDoAluno(ctx.alunoId);
    return linhas.map((l: any) => ({
      turmaDisciplinaId: String(l.turma_disciplina_id),
      disciplinaId: String(l.disciplina_id),
      codigo: l.disciplina_codigo,
      nome: l.disciplina_nome,
      turmaSigla: l.turma_sigla,
      professorNome: l.professor_nome,
      cargaHoraria: Number(l.carga_horaria),
      periodoLetivo: { id: String(l.periodo_id), codigo: l.periodo_codigo },
    }));
  }

  // GET /me/tarefas — avaliacoes a vencer (data_devolucao >= hoje), ordem crescente.
  async minhasTarefas(req: Request): Promise<TarefaAluno[]> {
    const ctx = await this.obterContextoAluno(req);
    const linhas = await this.repository.listarTarefasDoAluno(ctx.alunoId);
    return linhas.map((l: any) => ({
      avaliacaoId: String(l.avaliacao_id),
      titulo: this.titulo(l.descricao_avaliacao, l.tipo_avaliacao),
      tipo: l.tipo_avaliacao as TipoTarefa,
      disciplinaNome: l.disciplina_nome,
      turmaDisciplinaId: String(l.turma_disciplina_id),
      dataVencimento: this.iso(l.data_devolucao),
      valor: l.valor === null || l.valor === undefined ? null : Number(l.valor),
    }));
  }

  async meuDesempenhoCompetencias(req: Request): Promise<DesempenhoCompetenciasAluno> {
    const ctx = await this.obterContextoAluno(req);
    const [vinculos, competenciasPlanejadas, avaliacoesCompetencias, notas] = await Promise.all([
      this.repository.listarVinculosAtivosParaCompetencias(ctx.alunoId),
      this.repository.listarCompetenciasPlanejadasDoAluno(ctx.alunoId),
      this.repository.listarAvaliacoesCompetenciasDoAluno(ctx.alunoId),
      this.repository.listarNotasCompetenciasDoAluno(ctx.alunoId),
    ]);
    const dados = { alunos: vinculos, competenciasPlanejadas, avaliacoesCompetencias, notas };
    const disciplinas = vinculos.map((vinculo: any) => ({
      turmaDisciplinaId: String(vinculo.turma_disciplina_id),
      disciplina: {
        id: String(vinculo.disciplina_id),
        codigo: vinculo.disciplina_codigo,
        nome: vinculo.disciplina_nome,
      },
      turmaSigla: vinculo.turma_sigla,
      competencias: calcularDesempenhoCompetencias(
        dados,
        String(vinculo.turma_disciplina_id),
        ctx.alunoId,
      ) as DesempenhoCompetenciaAluno[],
    }));
    const todas = disciplinas.flatMap((item) => item.competencias);
    return {
      criterios: CRITERIOS_COMPETENCIA,
      resumo: {
        totalPlanejadas: todas.length,
        comResultados: todas.filter((item) => item.media !== null).length,
        comCoberturaSuficiente: todas.filter((item) => item.classificacao !== "DADOS_INSUFICIENTES").length,
        emAtencao: todas.filter((item) => item.classificacao === "DIFICULDADE" || item.classificacao === "ATENCAO").length,
      },
      disciplinas,
    };
  }

  // ----- internos -----

  private async obterContextoAluno(req: Request): Promise<ContextoAluno> {
    const user = (req as any)?.user;
    if (!user?.id || !user?.tipo_usuario) throw erroHomeAluno.proibido("Identidade autenticada inválida.");
    const tipo = String(user.tipo_usuario).trim().toLowerCase();
    if (tipo !== "aluno") throw erroHomeAluno.proibido("Recurso disponível apenas para alunos.");
    const aluno = await this.repository.buscarAlunoPorUsuarioId(String(user.id));
    if (!aluno?.id) throw erroHomeAluno.proibido("Usuário sem vínculo de aluno.");
    return { usuarioId: String(user.id), alunoId: String(aluno.id) };
  }

  private titulo(descricao: string | null | undefined, tipo: string): string {
    const limpo = String(descricao ?? "").trim();
    if (limpo) return limpo;
    return ROTULO_POR_TIPO[tipo] ?? tipo;
  }

  private iso(valor: unknown): string {
    return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
  }
}
