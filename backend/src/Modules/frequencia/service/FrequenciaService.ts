import { ConsolidadoFrequencia, EditarFrequenciaRequest, RegistrarFrequenciaRequest, StatusFrequencia } from "../models/Frequencia";
import { AuthContextGateway } from "../gateways/AuthContextGateway";
import { PeriodoLetivoGateway } from "../gateways/PeriodoLetivoGateway";
import { ProfessorTurmaGateway } from "../gateways/ProfessorTurmaGateway";
import { AlunoTurmaGateway } from "../gateways/AlunoTurmaGateway";
import { FrequenciaRepository } from "../repository/FrequenciaRepository";

export class FrequenciaService {
  constructor(private repository = new FrequenciaRepository(), private authGateway = new AuthContextGateway(repository), private periodoGateway = new PeriodoLetivoGateway(), private professorTurmaGateway = new ProfessorTurmaGateway(repository), private alunoTurmaGateway = new AlunoTurmaGateway(repository)) {}

  async listarOpcoes(req?: any) {
    const contexto = await this.authGateway.obterContexto(req);
    const turmas = await this.repository.listarTurmasDoProfessor(contexto.perfil === "PROFESSOR" ? contexto.professorId : undefined);
    return { contexto, periodoLetivo: this.periodoGateway.obterDescricao(), turmas: turmas.map((turma: any) => ({ id: turma.id, semestre: turma.semestre, professorId: turma.professor_id, disciplina: { id: turma.disciplina_id, codigo: turma.disciplina_codigo, nome: turma.disciplina_nome }, curso: { id: turma.curso_id, nome: turma.curso_nome } })) };
  }

  async obterChamada(turmaId: string, data: string, req?: any) {
    await this.validarAcessoTurma(turmaId, req);
    this.validarDataLancamento(new Date(`${data}T00:00:00`));
    const alunos = await this.alunoTurmaGateway.listarAlunosAtivos(turmaId);
    const registros = await this.repository.listarRegistrosDaChamada(turmaId, data);
    return { turmaId, data, alunos: alunos.map((aluno: any) => {
      const registro = registros.find((item: any) => item.aluno_id === aluno.aluno_id);
      return { id: aluno.aluno_id, matricula: aluno.matricula, nome: aluno.nome, statusMatricula: aluno.status, percentualAtual: Number(aluno.frequencia || 100), frequenciaId: registro?.id, status: registro?.status || "PRESENTE", justificativa: registro?.justificativa || "" };
    }), jaRegistrada: registros.length > 0 };
  }

  async registrarFrequencia(data: RegistrarFrequenciaRequest, req?: any) {
    this.validarPayloadRegistro(data);
    const contexto = await this.authGateway.obterContexto(req);
    await this.validarAcessoTurma(data.turmaId, req);
    if (!contexto.professorId) throw new Error("Professor responsavel nao identificado no contexto temporario.");
    const dataAula = new Date(`${data.data}T00:00:00`);
    this.validarDataLancamento(dataAula);
    const aula = data.aulaId ? await this.repository.buscarAulaPorId(data.aulaId) : await this.repository.obterOuCriarAula(data.turmaId, dataAula, contexto.professorId);
    if (!aula) throw new Error("Aula nao encontrada para registro de frequencia.");
    const alunosAtivos = await this.alunoTurmaGateway.listarAlunosAtivos(data.turmaId);
    const idsAlunosAtivos = new Set(alunosAtivos.map((aluno: any) => aluno.aluno_id));
    const registrosNovos = [];
    const registrosAtualizados = [];

    for (const registro of data.registros) {
      if (!idsAlunosAtivos.has(registro.alunoId)) throw new Error("Aluno sem matricula ativa nao pode receber frequencia nesta turma.");
      const existente = await this.repository.buscarRegistroPorAulaEAluno(aula.id, registro.alunoId);
      if (existente) {
        const atualizado = await this.repository.atualizarRegistro(existente.id, registro.status);
        if (atualizado) registrosAtualizados.push(atualizado);
        continue;
      }

      registrosNovos.push({
        aula_id: aula.id,
        aluno_id: registro.alunoId,
        turma_id: data.turmaId,
        status: registro.status,
        data: data.data,
        responsavel_lancamento_id: contexto.professorId,
      });
    }
    const registrosCriados = registrosNovos.length ? await this.repository.criarRegistros(registrosNovos) : [];
    const registrosSalvos = [...registrosCriados, ...registrosAtualizados];
    const consolidados = [];
    for (const registro of registrosSalvos) {
      const percentual = await this.repository.recalcularPercentualAlunoTurma(registro.alunoId, registro.turmaId);
      consolidados.push({ alunoId: registro.alunoId, percentual, situacao: this.classificarSituacao(percentual) });
    }
    return { mensagem: "Frequencia registrada com sucesso!", aulaId: aula.id, registros: registrosSalvos, consolidados };
  }

  async editarFrequencia(id: string, data: EditarFrequenciaRequest, req?: any) {
    this.validarStatus(data.status);
    const registro = await this.repository.buscarRegistroPorId(id);
    if (!registro) throw new Error("Registro de frequencia nao encontrado.");
    await this.validarAcessoTurma(registro.turmaId, req);
    this.validarPrazoEdicao(new Date(registro.criadoEm));
    const atualizado = await this.repository.atualizarRegistro(id, data.status);
    const percentual = await this.repository.recalcularPercentualAlunoTurma(registro.alunoId, registro.turmaId);
    return { mensagem: "Frequencia atualizada com sucesso!", registro: atualizado, consolidado: { alunoId: registro.alunoId, percentual, situacao: this.classificarSituacao(percentual) } };
  }

  async removerFrequencia(id: string, req?: any) {
    const registro = await this.repository.buscarRegistroPorId(id);
    if (!registro) throw new Error("Registro de frequencia nao encontrado.");
    await this.validarAcessoTurma(registro.turmaId, req);
    this.validarPrazoEdicao(new Date(registro.criadoEm));

    await this.repository.removerRegistro(id);
    const percentual = await this.repository.recalcularPercentualAlunoTurma(registro.alunoId, registro.turmaId);

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
    if (registro.status !== "AUSENTE") throw new Error("Nao e possivel registrar justificativa para aulas marcadas como presente.");
    await this.validarAcessoTurma(registro.turmaId, req);
    return { mensagem: "Justificativa registrada com sucesso!", registro: await this.repository.atualizarJustificativa(id, justificativa) };
  }

  async consultarAluno(alunoId: string, req?: any) {
    this.validarUuid(alunoId, "Aluno invalido. Selecione um aluno da lista de chamada.");
    const contexto = await this.authGateway.obterContexto(req);
    if (contexto.perfil === "ALUNO" && contexto.alunoId && contexto.alunoId !== alunoId) throw new Error("Aluno pode consultar apenas a propria frequencia.");
    const turmas = await this.repository.listarTurmasDoAluno(alunoId);
    const historico = await this.repository.listarHistoricoAluno(alunoId);
    const agrupado = new Map<string, any>();

    for (const turma of turmas) {
      agrupado.set(turma.turma_id, {
        alunoId: turma.aluno_id,
        alunoNome: turma.aluno_nome,
        turmaId: turma.turma_id,
        disciplinaId: turma.disciplina_id,
        disciplinaNome: turma.disciplina_nome,
        semestre: turma.semestre,
        totalAulas: 0,
        presencas: 0,
        faltas: 0,
      });
    }

    for (const item of historico) {
      const atual = agrupado.get(item.turma_id) || { alunoId, alunoNome: item.aluno_nome, turmaId: item.turma_id, disciplinaId: item.disciplina_id, disciplinaNome: item.disciplina_nome, semestre: item.semestre, totalAulas: 0, presencas: 0, faltas: 0 };
      atual.totalAulas += 1;
      atual.presencas += item.status === "PRESENTE" ? 1 : 0;
      atual.faltas += item.status === "AUSENTE" ? 1 : 0;
      agrupado.set(item.turma_id, atual);
    }
    const consolidado = Array.from(agrupado.values()).map((item) => {
      const percentual = this.calcularPercentual(item.presencas, item.totalAulas);
      return { ...item, percentual, situacao: this.classificarSituacao(percentual) };
    });
    return { alunoId, consolidado, historico: historico.map((item: any) => ({ id: item.id, aulaId: item.aula_id, turmaId: item.turma_id, disciplinaId: item.disciplina_id, disciplinaNome: item.disciplina_nome, data: item.data, status: item.status, justificativa: item.justificativa })) };
  }

  async consultarTurma(turmaId: string, req?: any, filtros?: { dataInicio?: string; dataFim?: string }) {
    await this.validarAcessoTurma(turmaId, req);
    const consolidado = await this.montarConsolidadoTurma(turmaId, filtros);
    return { turmaId, alunos: consolidado, alunosEmRisco: consolidado.filter((item) => item.situacao === "RISCO_REPROVACAO"), alunosEmAlerta: consolidado.filter((item) => item.situacao === "ALERTA") };
  }

  async gerarRelatorio(filtros: any, req?: any) {
    if (!filtros.turmaId) throw new Error("Informe a turma para gerar o relatorio.");
    const turma = await this.repository.buscarTurma(filtros.turmaId);
    if (!turma) throw new Error("Turma nao encontrada.");
    return { filtros: { turmaId: filtros.turmaId, disciplinaId: turma.disciplina_id, disciplinaNome: turma.disciplina_nome, dataInicio: filtros.dataInicio || null, dataFim: filtros.dataFim || null }, ...(await this.consultarTurma(filtros.turmaId, req, { dataInicio: filtros.dataInicio, dataFim: filtros.dataFim })) };
  }

  private async montarConsolidadoTurma(turmaId: string, filtros?: { dataInicio?: string; dataFim?: string }): Promise<ConsolidadoFrequencia[]> {
    const { totalAulas, rows } = await this.repository.buscarConsolidadoTurma(turmaId, filtros);
    return rows.map((row: any) => {
      const presencas = Number(row.presencas || 0);
      const percentual = this.calcularPercentual(presencas, totalAulas);
      return { alunoId: row.aluno_id, alunoNome: row.aluno_nome, turmaId: row.turma_id, disciplinaId: row.disciplina_id, disciplinaNome: row.disciplina_nome, totalAulas, presencas, faltas: Math.max(totalAulas - presencas, 0), percentual, situacao: this.classificarSituacao(percentual) };
    });
  }

  private async validarAcessoTurma(turmaId: string, req?: any) {
    const contexto = await this.authGateway.obterContexto(req);
    if (!(await this.professorTurmaGateway.validarVinculo(contexto, turmaId))) throw new Error("Voce nao possui permissao para acessar esta turma.");
  }

  private validarPayloadRegistro(data: RegistrarFrequenciaRequest) {
    if (!data?.turmaId || !data?.data || !Array.isArray(data.registros) || data.registros.length === 0) throw new Error("Informe turma, data e ao menos um registro de frequencia.");
    data.registros.forEach((registro) => this.validarStatus(registro.status));
  }

  private validarStatus(status: StatusFrequencia) {
    if (!["PRESENTE", "AUSENTE"].includes(status)) throw new Error("Status de frequencia invalido. Use PRESENTE ou AUSENTE.");
  }

  private validarUuid(valor: string, mensagem: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(valor)) throw new Error(mensagem);
  }

  private validarDataLancamento(data: Date) {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    if (data > hoje) throw new Error("Data invalida. Nao e possivel registrar frequencia para data futura.");
    if (!this.periodoGateway.validarData(data)) throw new Error("Data invalida. Registro fora do periodo letivo vigente.");
  }

  private validarPrazoEdicao(dataCriacao: Date) {
    const limite = new Date(dataCriacao);
    limite.setDate(limite.getDate() + 7);
    if (new Date() > limite) throw new Error("Prazo de edicao expirado. Nao e possivel alterar registros com mais de 7 dias.");
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
