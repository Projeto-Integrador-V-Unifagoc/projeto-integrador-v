import { AtualizarNotaDTO, BoletimAluno, LancarNotaDTO, NotaDetalhada, SituacaoNota, TipoAvaliacaoNota } from "../models/NotasModels.js";
import { NotasRepository } from "../repository/NotasRepository.js";

const TIPOS_VALIDOS: TipoAvaliacaoNota[] = ["PROVA", "TPI", "TRABALHO"];

export class NotasService {
  constructor(private repository = new NotasRepository()) {}

  async listar(): Promise<BoletimAluno[]> {
    return this.agruparBoletins(await this.repository.listar());
  }

  async buscarPorId(id: string): Promise<NotaDetalhada> {
    this.validarUuid(id, "Nota invalida.");
    const nota = await this.repository.buscarPorId(id);
    if (!nota) throw new Error("Nota nao encontrada.");
    return nota;
  }

  async listarPorAluno(alunoId: string): Promise<BoletimAluno[]> {
    this.validarUuid(alunoId, "Aluno invalido.");
    return this.agruparBoletins(await this.repository.listarPorAluno(alunoId));
  }

  async listarPorTurma(turmaId: string): Promise<BoletimAluno[]> {
    this.validarUuid(turmaId, "Turma invalida.");
    return this.agruparBoletins(await this.repository.listarPorTurma(turmaId));
  }

  async listarPorTurmaDisciplina(turmaDisciplinaId: string): Promise<BoletimAluno[]> {
    this.validarUuid(turmaDisciplinaId, "Turma-disciplina invalida.");
    return this.agruparBoletins(await this.repository.listarPorTurmaDisciplina(turmaDisciplinaId));
  }

  async lancar(data: LancarNotaDTO): Promise<NotaDetalhada> {
    const payload = await this.normalizarPayload(data);
    this.validarPayload(payload);
    return this.repository.criar(payload);
  }

  async atualizar(id: string, data: AtualizarNotaDTO): Promise<NotaDetalhada> {
    this.validarUuid(id, "Nota invalida.");
    const atual = await this.repository.buscarPorId(id);
    if (!atual) throw new Error("Nota nao encontrada.");

    const merged = await this.normalizarPayload({
      tipo_avaliacao: data.tipo_avaliacao ?? atual.tipo_avaliacao,
      descricao_avaliacao:
        data.descricao_avaliacao !== undefined ? data.descricao_avaliacao : atual.descricao_avaliacao,
      data_lancamento: data.data_lancamento ?? atual.data_lancamento,
      valor: data.valor ?? atual.valor,
      nota: data.nota ?? atual.nota,
      data_devolucao: data.data_devolucao !== undefined ? data.data_devolucao : atual.data_devolucao,
      turma_disciplina_id: data.turma_disciplina_id ?? atual.turma_disciplina_id,
      matricula_turma_disciplina_id:
        data.matricula_turma_disciplina_id ?? atual.matricula_turma_disciplina_id,
      aluno_id: data.aluno_id,
    });

    this.validarPayload(merged);
    const atualizada = await this.repository.atualizar(id, this.removerCamposIndefinidos(merged));
    if (!atualizada) throw new Error("Nota nao encontrada.");
    return atualizada;
  }

  async remover(id: string): Promise<{ mensagem: string }> {
    this.validarUuid(id, "Nota invalida.");
    const nota = await this.repository.buscarPorId(id);
    if (!nota) throw new Error("Nota nao encontrada.");

    await this.repository.remover(id);
    return { mensagem: "Nota removida com sucesso!" };
  }

  private async normalizarPayload<T extends LancarNotaDTO | AtualizarNotaDTO>(data: T): Promise<T> {
    if (!data?.turma_disciplina_id) throw new Error("O campo turma_disciplina_id e obrigatorio.");

    this.validarUuid(data.turma_disciplina_id, "Turma-disciplina invalida.");
    if (!(await this.repository.turmaDisciplinaExiste(data.turma_disciplina_id))) {
      throw new Error("Turma-disciplina nao encontrada.");
    }

    if (!data.matricula_turma_disciplina_id && data.aluno_id) {
      this.validarUuid(data.aluno_id, "Aluno invalido.");
      const vinculo = await this.repository.buscarVinculoMatriculaDisciplina(
        data.turma_disciplina_id,
        data.aluno_id,
      );
      if (!vinculo) throw new Error("Aluno nao possui matricula ativa nesta turma-disciplina.");
      data.matricula_turma_disciplina_id = vinculo.id;
    }

    if (!data.matricula_turma_disciplina_id) {
      throw new Error("Informe matricula_turma_disciplina_id ou aluno_id.");
    }

    this.validarUuid(data.matricula_turma_disciplina_id, "Matricula da turma-disciplina invalida.");
    const vinculo = await this.repository.buscarVinculoPorId(data.matricula_turma_disciplina_id);
    if (!vinculo) throw new Error("Matricula da turma-disciplina nao encontrada.");
    if (vinculo.turma_disciplina_id !== data.turma_disciplina_id) {
      throw new Error("A matricula informada nao pertence a turma-disciplina da nota.");
    }

    data.tipo_avaliacao = data.tipo_avaliacao?.toUpperCase() as TipoAvaliacaoNota;
    data.descricao_avaliacao = data.descricao_avaliacao?.trim() || null;
    data.valor = Number(data.valor);
    data.nota = Number(data.nota);

    return data;
  }

  private validarPayload(data: LancarNotaDTO) {
    if (!TIPOS_VALIDOS.includes(data.tipo_avaliacao)) {
      throw new Error(`Tipo de avaliacao invalido. Use: ${TIPOS_VALIDOS.join(", ")}.`);
    }

    if (!Number.isFinite(data.valor) || data.valor <= 0) {
      throw new Error("Valor da avaliacao invalido.");
    }

    if (!Number.isFinite(data.nota) || data.nota < 0) {
      throw new Error("Nota invalida.");
    }

    if (data.nota > data.valor) {
      throw new Error("A nota nao pode ser maior que o valor da avaliacao.");
    }

    if (
      data.data_lancamento &&
      Number.isNaN(Date.parse(String(data.data_lancamento)))
    ) {
      throw new Error("Data de lancamento invalida.");
    }

    if (
      data.data_devolucao !== undefined &&
      data.data_devolucao !== null &&
      Number.isNaN(Date.parse(String(data.data_devolucao)))
    ) {
      throw new Error("Data de devolucao invalida.");
    }
  }

  private agruparBoletins(notas: NotaDetalhada[]): BoletimAluno[] {
    const boletins = new Map<string, NotaDetalhada[]>();

    for (const nota of notas) {
      const chave = nota.matricula_turma_disciplina_id;
      boletins.set(chave, [...(boletins.get(chave) || []), nota]);
    }

    return Array.from(boletins.values()).map((avaliacoes) => {
      const primeira = avaliacoes[0];
      const totalDistribuido = this.arredondar(avaliacoes.reduce((total, nota) => total + nota.valor, 0));
      const totalObtido = this.arredondar(avaliacoes.reduce((total, nota) => total + nota.nota, 0));
      const media = totalDistribuido === 0 ? 0 : this.arredondar((totalObtido / totalDistribuido) * 100);

      return {
        alunoId: primeira.aluno_id,
        alunoNome: primeira.aluno_nome,
        alunoMatricula: primeira.aluno_matricula,
        matriculaTurmaDisciplinaId: primeira.matricula_turma_disciplina_id,
        turmaDisciplinaId: primeira.turma_disciplina_id,
        turmaId: primeira.turma_id,
        turma: `${primeira.turma_sigla} - ${primeira.turma_descricao}`,
        disciplinaId: primeira.disciplina_id,
        disciplinaCodigo: primeira.disciplina_codigo,
        disciplinaNome: primeira.disciplina_nome,
        professorId: primeira.professor_id,
        professorNome: primeira.professor_nome,
        periodoLetivo: primeira.periodo_letivo_codigo,
        avaliacoes,
        totalDistribuido,
        totalObtido,
        media,
        situacao: this.classificarSituacao(media, avaliacoes.length),
      };
    });
  }

  private classificarSituacao(media: number, quantidadeAvaliacoes: number): SituacaoNota {
    if (quantidadeAvaliacoes === 0) return "SEM_NOTA";
    if (media >= 60) return "APROVADO";
    if (media >= 40) return "RECUPERACAO";
    return "REPROVADO";
  }

  private arredondar(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private validarUuid(valor: string, mensagem: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(valor)) throw new Error(mensagem);
  }

  private removerCamposIndefinidos<T extends Record<string, any>>(data: T): T {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
  }
}
