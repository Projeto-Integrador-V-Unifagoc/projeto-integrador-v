import {
  ConsolidadoFrequencia,
  EditarFrequenciaRequest,
  RegistrarFrequenciaRequest,
  StatusFrequencia,
} from "../models/Frequencia";
import { AuthContextGateway } from "../gateways/AuthContextGateway";
import { PeriodoLetivoGateway } from "../gateways/PeriodoLetivoGateway";
import { ProfessorTurmaGateway } from "../gateways/ProfessorTurmaGateway";
import { AlunoTurmaGateway } from "../gateways/AlunoTurmaGateway";
import { FrequenciaRepository } from "../repository/FrequenciaRepository";

export class FrequenciaService {
  constructor(
    private repository = new FrequenciaRepository(),
    private authGateway = new AuthContextGateway(repository),
    private periodoGateway = new PeriodoLetivoGateway(),
    private professorTurmaGateway = new ProfessorTurmaGateway(repository),
    private alunoTurmaGateway = new AlunoTurmaGateway(repository),
  ) {}

  async listarOpcoes(req?: any) {
    const contexto = await this.authGateway.obterContexto(req);
    const turmas = await this.repository.listarTurmasDoProfessor(
      contexto.perfil === "PROFESSOR" ? contexto.professorId : undefined,
    );

    return {
      contexto,
      periodoLetivo: this.periodoGateway.obterDescricao(),
      turmas: turmas.map((turma: any) => ({
        id: turma.id,
        turmaDisciplinaId: turma.id,
        turmaId: turma.turma_id,
        semestre: `${turma.ano}/${turma.semestre}`,
        sigla: turma.turma_sigla,
        descricao: turma.turma_descricao,
        professorId: turma.professor_id,
        disciplina: {
          id: turma.disciplina_id,
          codigo: turma.disciplina_codigo,
          nome: turma.disciplina_nome,
        },
        curso: { id: turma.curso_id, nome: turma.curso_nome },
      })),
    };
  }

  async obterChamada(turmaDisciplinaId: string, data: string, req?: any) {
    this.validarUuid(turmaDisciplinaId, "Turma/disciplina invalida.");
    await this.validarAcessoTurma(turmaDisciplinaId, req);
    this.validarDataLancamento(new Date(`${data}T00:00:00`));

    const alunos = await this.alunoTurmaGateway.listarAlunosAtivos(turmaDisciplinaId);
    const registros = await this.repository.listarRegistrosDaChamada(turmaDisciplinaId, data);

    return {
      turmaDisciplinaId,
      data,
      alunos: await Promise.all(
        alunos.map(async (aluno: any) => {
          const registro = registros.find(
            (item: any) =>
              item.matricula_turma_disciplina_id === aluno.matricula_turma_disciplina_id,
          );
          const percentualAtual = await this.repository.calcularPercentualMatriculaTurmaDisciplina(
            aluno.matricula_turma_disciplina_id,
          );

          return {
            id: aluno.aluno_id,
            matriculaTurmaDisciplinaId: aluno.matricula_turma_disciplina_id,
            matricula: aluno.matricula,
            nome: aluno.nome,
            statusMatricula: aluno.status,
            percentualAtual,
            frequenciaId: registro?.id,
            status: registro?.status || "PRESENTE",
            justificativa: registro?.justificativa || "",
          };
        }),
      ),
      jaRegistrada: registros.length > 0,
    };
  }

  async registrarFrequencia(data: RegistrarFrequenciaRequest, req?: any) {
    this.validarPayloadRegistro(data);
    const contexto = await this.authGateway.obterContexto(req);
    await this.validarAcessoTurma(data.turmaDisciplinaId, req);
    if (!contexto.professorId) {
      throw new Error("Professor responsavel nao identificado.");
    }

    const dataAula = new Date(`${data.data}T00:00:00`);
    this.validarDataLancamento(dataAula);
    const aula = data.aulaId
      ? await this.repository.buscarAulaPorId(data.aulaId)
      : await this.repository.obterOuCriarAula(
          data.turmaDisciplinaId,
          dataAula,
          contexto.professorId,
        );
    if (!aula) throw new Error("Aula nao encontrada para registro de frequencia.");

    const alunosAtivos = await this.alunoTurmaGateway.listarAlunosAtivos(data.turmaDisciplinaId);
    const alunosPorId = new Map(alunosAtivos.map((aluno: any) => [aluno.aluno_id, aluno]));

    for (const registro of data.registros) {
      const aluno = alunosPorId.get(registro.alunoId) as any;
      if (!aluno) {
        throw new Error("Aluno sem matricula ativa nao pode receber frequencia nesta turma.");
      }
      if (
        await this.repository.buscarRegistroPorAulaEMatricula(
          aula.id,
          aluno.matricula_turma_disciplina_id,
        )
      ) {
        throw new Error("Frequencia ja registrada para esta aula. Utilize a edicao para alterar.");
      }
    }

    const registrosCriados = await this.repository.criarRegistros(
      data.registros.map((registro) => {
        const aluno = alunosPorId.get(registro.alunoId) as any;
        return {
          aula_id: aula.id,
          matricula_turma_disciplina_id: aluno.matricula_turma_disciplina_id,
          status: registro.status,
          data: data.data,
        };
      }),
    );

    const consolidados = [];
    for (const registro of registrosCriados) {
      const percentual = await this.repository.recalcularPercentualAlunoTurma(
        registro.alunoId,
        registro.turmaDisciplinaId,
      );
      consolidados.push({
        alunoId: registro.alunoId,
        percentual,
        situacao: this.classificarSituacao(percentual),
      });
    }

    return {
      mensagem: "Frequencia registrada com sucesso!",
      aulaId: aula.id,
      registros: registrosCriados,
      consolidados,
    };
  }

  async editarFrequencia(id: string, data: EditarFrequenciaRequest, req?: any) {
    this.validarStatus(data.status);
    const registro = await this.repository.buscarRegistroPorId(id);
    if (!registro) throw new Error("Registro de frequencia nao encontrado.");
    await this.validarAcessoTurma(registro.turmaDisciplinaId, req);
    this.validarPrazoEdicao(new Date(registro.criadoEm));
    const atualizado = await this.repository.atualizarRegistro(id, data.status);
    const percentual = await this.repository.recalcularPercentualAlunoTurma(
      registro.alunoId,
      registro.turmaDisciplinaId,
    );
    return {
      mensagem: "Frequencia atualizada com sucesso!",
      registro: atualizado,
      consolidado: {
        alunoId: registro.alunoId,
        percentual,
        situacao: this.classificarSituacao(percentual),
      },
    };
  }

  async removerFrequencia(id: string, req?: any) {
    const registro = await this.repository.buscarRegistroPorId(id);
    if (!registro) throw new Error("Registro de frequencia nao encontrado.");
    await this.validarAcessoTurma(registro.turmaDisciplinaId, req);
    this.validarPrazoEdicao(new Date(registro.criadoEm));

    await this.repository.removerRegistro(id);
    const percentual = await this.repository.recalcularPercentualAlunoTurma(
      registro.alunoId,
      registro.turmaDisciplinaId,
    );

    return {
      mensagem: "Frequencia removida com sucesso!",
      consolidado: {
        alunoId: registro.alunoId,
        percentual,
        situacao: this.classificarSituacao(percentual),
      },
    };
  }

  async registrarJustificativa(id: string, justificativa: string, req?: any) {
    const registro = await this.repository.buscarRegistroPorId(id);
    if (!registro) throw new Error("Registro de frequencia nao encontrado.");
    if (registro.status !== "AUSENTE") {
      throw new Error("Nao e possivel registrar justificativa para aulas marcadas como presente.");
    }
    await this.validarAcessoTurma(registro.turmaDisciplinaId, req);
    return {
      mensagem: "Justificativa registrada com sucesso!",
      registro: await this.repository.atualizarJustificativa(id, justificativa),
    };
  }

  async consultarAluno(alunoId: string, req?: any) {
    this.validarUuid(alunoId, "Aluno invalido. Selecione um aluno da lista de chamada.");
    const contexto = await this.authGateway.obterContexto(req);
    if (contexto.perfil === "ALUNO" && contexto.alunoId && contexto.alunoId !== alunoId) {
      throw new Error("Aluno pode consultar apenas a propria frequencia.");
    }
    const historico = await this.repository.listarHistoricoAluno(alunoId);
    const agrupado = new Map<string, any>();
    for (const item of historico) {
      const atual = agrupado.get(item.turma_disciplina_id) || {
        turmaDisciplinaId: item.turma_disciplina_id,
        disciplinaId: item.disciplina_id,
        disciplinaNome: item.disciplina_nome,
        totalAulas: 0,
        presencas: 0,
        faltas: 0,
      };
      atual.totalAulas += 1;
      atual.presencas += item.status === "PRESENTE" ? 1 : 0;
      atual.faltas += item.status === "AUSENTE" ? 1 : 0;
      agrupado.set(item.turma_disciplina_id, atual);
    }
    const consolidado = Array.from(agrupado.values()).map((item) => {
      const percentual = this.calcularPercentual(item.presencas, item.totalAulas);
      return { ...item, percentual, situacao: this.classificarSituacao(percentual) };
    });
    return {
      alunoId,
      consolidado,
      historico: historico.map((item: any) => ({
        id: item.id,
        aulaId: item.aula_id,
        turmaDisciplinaId: item.turma_disciplina_id,
        disciplinaId: item.disciplina_id,
        disciplinaNome: item.disciplina_nome,
        data: item.data,
        status: item.status,
        justificativa: item.justificativa,
      })),
    };
  }

  async consultarTurma(turmaDisciplinaId: string, req?: any, filtros?: { dataInicio?: string; dataFim?: string }) {
    await this.validarAcessoTurma(turmaDisciplinaId, req);
    const consolidado = await this.montarConsolidadoTurma(turmaDisciplinaId, filtros);
    return {
      turmaDisciplinaId,
      alunos: consolidado,
      alunosEmRisco: consolidado.filter((item) => item.situacao === "RISCO_REPROVACAO"),
      alunosEmAlerta: consolidado.filter((item) => item.situacao === "ALERTA"),
    };
  }

  async gerarRelatorio(filtros: any, req?: any) {
    const turmaDisciplinaId = filtros.turmaDisciplinaId || filtros.turmaId;
    if (!turmaDisciplinaId) throw new Error("Informe a turma/disciplina para gerar o relatorio.");
    const turma = await this.repository.buscarTurma(turmaDisciplinaId);
    if (!turma) throw new Error("Turma/disciplina nao encontrada.");
    return {
      filtros: {
        turmaDisciplinaId,
        disciplinaId: turma.disciplina_id,
        disciplinaNome: turma.disciplina_nome,
        dataInicio: filtros.dataInicio || null,
        dataFim: filtros.dataFim || null,
      },
      ...(await this.consultarTurma(turmaDisciplinaId, req, {
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim,
      })),
    };
  }

  private async montarConsolidadoTurma(
    turmaDisciplinaId: string,
    filtros?: { dataInicio?: string; dataFim?: string },
  ): Promise<ConsolidadoFrequencia[]> {
    const { totalAulas, rows } = await this.repository.buscarConsolidadoTurma(
      turmaDisciplinaId,
      filtros,
    );
    return rows.map((row: any) => {
      const presencas = Number(row.presencas || 0);
      const percentual = this.calcularPercentual(presencas, totalAulas);
      return {
        alunoId: row.aluno_id,
        alunoNome: row.aluno_nome,
        turmaDisciplinaId: row.turma_disciplina_id,
        disciplinaId: row.disciplina_id,
        disciplinaNome: row.disciplina_nome,
        totalAulas,
        presencas,
        faltas: Math.max(totalAulas - presencas, 0),
        percentual,
        situacao: this.classificarSituacao(percentual),
      };
    });
  }

  private async validarAcessoTurma(turmaDisciplinaId: string, req?: any) {
    const contexto = await this.authGateway.obterContexto(req);
    if (!(await this.professorTurmaGateway.validarVinculo(contexto, turmaDisciplinaId))) {
      throw new Error("Voce nao possui permissao para acessar esta turma/disciplina.");
    }
  }

  private validarPayloadRegistro(data: RegistrarFrequenciaRequest) {
    if (
      !data?.turmaDisciplinaId ||
      !data?.data ||
      !Array.isArray(data.registros) ||
      data.registros.length === 0
    ) {
      throw new Error("Informe turma/disciplina, data e ao menos um registro de frequencia.");
    }
    data.registros.forEach((registro) => this.validarStatus(registro.status));
  }

  private validarStatus(status: StatusFrequencia) {
    if (!["PRESENTE", "AUSENTE"].includes(status)) {
      throw new Error("Status de frequencia invalido. Use PRESENTE ou AUSENTE.");
    }
  }

  private validarUuid(valor: string, mensagem: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(valor)) throw new Error(mensagem);
  }

  private validarDataLancamento(data: Date) {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    if (data > hoje) throw new Error("Data invalida. Nao e possivel registrar frequencia para data futura.");
    if (!this.periodoGateway.validarData(data)) {
      throw new Error("Data invalida. Registro fora do periodo letivo vigente.");
    }
  }

  private validarPrazoEdicao(dataCriacao: Date) {
    const limite = new Date(dataCriacao);
    limite.setDate(limite.getDate() + 7);
    if (new Date() > limite) {
      throw new Error("Prazo de edicao expirado. Nao e possivel alterar registros com mais de 7 dias.");
    }
  }

  private calcularPercentual(presencas: number, totalAulas: number) {
    if (totalAulas === 0) return 100;
    return Number(((presencas / totalAulas) * 100).toFixed(2));
  }

  private classificarSituacao(percentual: number) {
    if (percentual < 75) return "RISCO_REPROVACAO";
    if (percentual <= 80) return "ALERTA";
    return "REGULAR";
  }
}
