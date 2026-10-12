import type { Request } from "express";
import { NotaError, erroNota } from "../../notas/errors/NotaError";
import type { ResultadoAcademico } from "../../notas/models/ResultadoAcademico";
import { RelatorioAcademicoGateway } from "../gateways/RelatorioAcademicoGateway";
import {
  DisciplinaRelatorio,
  FiltrosRelatorioAcademico,
  PerfilRelatorio,
  PeriodoRelatorio,
  RelatorioAcademicoLinha,
  RelatorioItem,
  RelatorioLinhaPdf,
  SituacaoAcademica,
  TipoRelatorio,
} from "../models/RelatorioAcademico";
import { RelatorioRepository } from "../repository/RelatorioRepository";

export class RelatorioService {
  private repository = new RelatorioRepository();

  private gateway = new RelatorioAcademicoGateway();

  private validarAutenticacao(req?: Request) {
    const user = (req as any)?.user;
    if (!user?.id) throw new NotaError("Autenticação necessária.", 401, "AUTENTICACAO_NECESSARIA");
    if (!["aluno", "professor", "secretaria", "administrador"].includes(user.tipo_usuario)) throw erroNota.proibido();
  }

  async listarRelatorios(filtros: FiltrosRelatorioAcademico, req?: Request) {
    this.validarAutenticacao(req);
    const lote = await this.repository.carregarResultadoAcademico(filtros, req!);
    const perfil: PerfilRelatorio = lote.contexto.perfil === "aluno" ? "Aluno" : lote.contexto.perfil === "professor" ? "Professor" : "Secretaria";
    const ofertas = new Map(lote.ofertas.map(o => [o.id, o]));
    const linhas: RelatorioAcademicoLinha[] = [], notas: RelatorioAcademicoLinha[] = [];
    for (const matricula of lote.matriculas) {
      const oferta = ofertas.get(matricula.turma_disciplina_id);
      const resultado = matricula.resultadoAcademico;
      if (!oferta || resultado.turmaDisciplinaId !== oferta.id ||
        resultado.matriculaTurmaDisciplinaId !== matricula.matricula_turma_disciplina_id) {
        throw new Error("Resultado incompatível com o lote autorizado.");
      }
      if (filtros.cursoId && oferta.curso_id !== filtros.cursoId.toLowerCase()) continue;
      if (filtros.disciplinaId && oferta.disciplina_id !== filtros.disciplinaId.toLowerCase()) continue;
      if (filtros.matricula && String(matricula.matricula) !== filtros.matricula) continue;
      const linha: RelatorioAcademicoLinha = {
        turmaDisciplinaId: oferta.id, matriculaTurmaDisciplinaId: matricula.matricula_turma_disciplina_id,
        periodoLetivoId: oferta.periodo_letivo_id, resultadoAcademico: resultado,
        alunoId: matricula.aluno_id, aluno: matricula.aluno_nome, matricula: matricula.matricula,
        cursoId: oferta.curso_id, curso: oferta.curso_nome ?? "Curso nao informado",
        periodo: oferta.periodo_codigo ?? "Periodo nao informado", turmaId: oferta.id, disciplinaId: oferta.disciplina_id,
        disciplina: oferta.disciplina_nome ?? "Sem disciplina vinculada", cargaHoraria: oferta.carga_horaria ?? 0,
        ano: oferta.ano && oferta.semestre ? `${oferta.ano}/${oferta.semestre}` : String(oferta.ano ?? "Atual"),
        nota: resultado.pontosEfetivos, frequencia: resultado.frequencia.percentual,
        totalAulas: resultado.frequencia.presencas + resultado.frequencia.faltas,
        presencas: resultado.frequencia.presencas, faltas: resultado.frequencia.faltas,
      };
      linhas.push(linha);
      for (const avaliacao of oferta.avaliacoes) notas.push({ ...linha,
        avaliacao: avaliacao.descricao ?? avaliacao.tipo, tipoAvaliacao: avaliacao.tipo,
        valorAvaliacao: avaliacao.valor, dataAvaliacao: avaliacao.data_lancamento,
        nota: matricula.notas.has(avaliacao.id) ? matricula.notas.get(avaliacao.id)! : null,
      });
    }
    // Rede externa ocorre depois de encerrar o snapshot comum e jamais amplia o lote autorizado.
    const origem = this.gateway.estaConfigurado() ? await this.gateway.listarLinhas(filtros, linhas) : linhas;
    return this.montarRelatorios(origem, { ...filtros, perfil }, notas);
  }

  async obterStatusFonteDados(req?: Request) {
    this.validarAutenticacao(req);
    return { source: "database", schema: "piv", tabelas: await this.repository.contarFontesAcademicas() };
  }

  private montarRelatorios(
    linhasOriginais: RelatorioAcademicoLinha[],
    filtros: FiltrosRelatorioAcademico,
    notasOriginais: RelatorioAcademicoLinha[] = []
  ): RelatorioItem[] {
    const perfil = filtros.perfil ?? "Professor";
    const termo = this.normalizarBusca(filtros.busca).trim();
    const linhas = linhasOriginais.filter((linha) => this.linhaPassaNoAno(linha, filtros));
    const origemNotas = perfil === "Aluno" ? notasOriginais : linhasOriginais;
    const notas = origemNotas.filter((linha) => this.linhaPassaNoAno(linha, filtros));
    const chaves = Array.from(
      new Set([...linhas, ...notas].map((linha) => this.chaveAnoCurso(linha)))
    );
    const relatorios: RelatorioItem[] = [];

    chaves.forEach((chave, index) => {
      const [ano, _cursoId, curso] = chave.split("||");
      const linhasDoCurso = linhas.filter((linha) => this.chaveAnoCurso(linha) === chave);
      const notasDoCurso = notas.filter((linha) => this.chaveAnoCurso(linha) === chave);
      const baseId = index * 10;

      relatorios.push(
        this.criarRelatorio(baseId + 1, "Notas", perfil, ano, curso, this.montarPeriodos(notasDoCurso, perfil, "Notas")),
        this.criarRelatorio(
          baseId + 2,
          "Frequencia",
          perfil,
          ano,
          curso,
          this.montarPeriodos(linhasDoCurso, perfil, "Frequencia")
        ),
        this.criarRelatorio(
          baseId + 3,
          "Historico",
          perfil,
          ano,
          curso,
          this.montarPeriodos(linhasDoCurso, perfil, "Historico")
        )
      );

      if (perfil !== "Aluno") {
        relatorios.push(
          this.criarRelatorio(
            baseId + 4,
            "Consulta",
            perfil,
            ano,
            curso,
            this.montarPeriodos(linhasDoCurso, perfil, "Consulta")
          )
        );
      }
    });

    return relatorios.filter((relatorio) => {
      const tipoValido = !filtros.tipo || filtros.tipo === "Todos" || relatorio.tipo === filtros.tipo;
      const possuiDados = relatorio.periodos.some((periodo) => periodo.disciplinas.length > 0);
      const buscaValida = !termo || this.relatorioPassaNaBusca(relatorio, termo);
      return tipoValido && possuiDados && buscaValida;
    });
  }

  private linhaPassaNoAno(
    linha: RelatorioAcademicoLinha,
    filtros: FiltrosRelatorioAcademico
  ) {
    return !filtros.ano || filtros.ano === "Todos" || String(linha.ano) === filtros.ano;
  }

  private relatorioPassaNaBusca(relatorio: RelatorioItem, termo: string) {
    const valores: unknown[] = [
      relatorio.nome,
      relatorio.descricao,
      relatorio.tipo,
      relatorio.ano,
      relatorio.curso,
      relatorio.matrizCurricular,
    ];

    relatorio.periodos.forEach((periodo) => {
      valores.push(periodo.nome);
      periodo.disciplinas.forEach((disciplina) => {
        valores.push(
          disciplina.nome,
          disciplina.aluno,
          disciplina.avaliacao,
          disciplina.tipoAvaliacao,
          disciplina.valorAvaliacao,
          disciplina.dataAvaliacao,
          disciplina.nota,
          disciplina.frequencia,
          disciplina.totalAulas,
          disciplina.presencas,
          disciplina.faltas,
          disciplina.situacao
        );
      });
    });

    relatorio.pdf.linhas.forEach((linha) => {
      valores.push(...Object.values(linha));
    });

    return valores.some((valor) => this.normalizarBusca(valor).includes(termo));
  }

  private normalizarBusca(valor: unknown) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  private chaveAnoCurso(linha: RelatorioAcademicoLinha) {
    return `${String(linha.ano || "Atual")}||${linha.cursoId ?? ""}||${linha.curso || "Curso nao informado"}`;
  }

  private montarPeriodos(
    linhas: RelatorioAcademicoLinha[],
    perfil: PerfilRelatorio,
    tipo: TipoRelatorio
  ): PeriodoRelatorio[] {
    const grupos = new Map<string, PeriodoRelatorio>();
    for (const linha of linhas) {
      const periodo = grupos.get(linha.periodoLetivoId) ?? { id: linha.periodoLetivoId,
        nome: linha.periodo || linha.ano || "Periodo nao informado", disciplinas: [] };
      periodo.disciplinas.push({
        turmaDisciplinaId: linha.turmaDisciplinaId, matriculaTurmaDisciplinaId: linha.matriculaTurmaDisciplinaId,
        resultadoAcademico: linha.resultadoAcademico,
        nome: linha.disciplina || "Sem disciplina vinculada", aluno: perfil !== "Aluno" ? linha.aluno : undefined,
        cargaHoraria: `${linha.cargaHoraria}h`, avaliacao: this.nomeAvaliacao(linha),
        tipoAvaliacao: this.labelTipoAvaliacao(linha.tipoAvaliacao), valorAvaliacao: linha.valorAvaliacao ?? undefined,
        dataAvaliacao: this.formatarData(linha.dataAvaliacao), nota: linha.nota,
        frequencia: linha.frequencia === null ? null : `${linha.frequencia}%`,
        totalAulas: this.formatarInteiro(linha.totalAulas), presencas: this.formatarInteiro(linha.presencas),
        faltas: this.formatarInteiro(linha.faltas), situacao: this.situacaoDoResultado(linha.resultadoAcademico),
      });
      grupos.set(linha.periodoLetivoId, periodo);
    }
    return [...grupos.values()];
  }

  private criarRelatorio(
    id: number,
    tipo: TipoRelatorio,
    perfil: PerfilRelatorio,
    ano: string,
    curso: string,
    periodos: PeriodoRelatorio[]
  ): RelatorioItem {
    const incluirAluno = perfil !== "Aluno";
    const nomes = this.nomesRelatorio(tipo, perfil);
    const linhas = this.linhasPorPeriodo(periodos, incluirAluno);
    const pdfConfig = this.pdfConfig(tipo, incluirAluno, linhas);

    return {
      id,
      nome: nomes.nome,
      descricao: nomes.descricao,
      tipo,
      ano,
      perfis: [perfil],
      curso,
      matrizCurricular: `Matriz ${curso} ${ano}`,
      periodos,
      pdf: {
        titulo: nomes.titulo,
        universidade: "UniEduca",
        rodape: "Documento emitido pelo sistema academico UniEduca.",
        ...pdfConfig,
      },
    };
  }

  private nomesRelatorio(tipo: TipoRelatorio, perfil: PerfilRelatorio) {
    const aluno = perfil === "Aluno";
    const nomes = {
      Notas: {
        nome: aluno ? "Minhas Notas" : "Relatorio de Notas",
        descricao: aluno
          ? "Notas do aluno organizadas por periodo e disciplina."
          : "Notas dos alunos por periodo letivo.",
        titulo: aluno ? "MINHAS NOTAS" : "RELATORIO DE NOTAS",
      },
      Frequencia: {
        nome: aluno ? "Minha Frequencia" : "Relatorio de Frequencia",
        descricao: aluno
          ? "Comparecimento do aluno nas disciplinas da matriz curricular."
          : "Acompanhamento de comparecimento por aluno, disciplina e periodo.",
        titulo: aluno ? "MINHA FREQUENCIA" : "RELATORIO DE FREQUENCIA",
      },
      Consulta: {
        nome: "Consulta de Alunos",
        descricao: "Consulta academica dos alunos vinculados ao curso.",
        titulo: "CONSULTA DE ALUNOS",
      },
      Historico: {
        nome: aluno ? "Meu Historico Escolar" : "Historico Escolar",
        descricao: aluno
          ? "Historico escolar individual do aluno."
          : "Historico academico completo para acompanhamento institucional.",
        titulo: aluno ? "MEU HISTORICO ESCOLAR" : "HISTORICO ESCOLAR",
      },
    };

    return nomes[tipo];
  }

  private linhasPorPeriodo(periodos: PeriodoRelatorio[], incluirAluno: boolean): RelatorioLinhaPdf[] {
    return periodos.flatMap((periodo) =>
      periodo.disciplinas.map((disciplina) => ({
        ...(incluirAluno ? { Aluno: disciplina.aluno ?? "Aluno" } : {}),
        Periodo: periodo.nome,
        Disciplina: disciplina.nome,
        Avaliacao: disciplina.avaliacao ?? "-",
        Tipo: disciplina.tipoAvaliacao ?? "-",
        "Carga Horaria": disciplina.cargaHoraria,
        Nota: disciplina.nota ?? "-",
        Pontos: disciplina.resultadoAcademico.pontosEfetivos ?? "-",
        Total: disciplina.resultadoAcademico.totalPontos ?? "-",
        Corte: disciplina.resultadoAcademico.cortePontos ?? "-",
        Valor: disciplina.valorAvaliacao ?? "-",
        Data: disciplina.dataAvaliacao ?? "-",
        Frequencia: disciplina.frequencia ?? "-",
        Aulas: disciplina.totalAulas ?? "-",
        Presencas: disciplina.presencas ?? "-",
        Faltas: disciplina.faltas ?? "-",
        Situacao: this.labelSituacao(disciplina.situacao),
      }))
    );
  }

  private pdfConfig(tipo: TipoRelatorio, incluirAluno: boolean, linhas: RelatorioLinhaPdf[]) {
    if (tipo === "Notas") {
      const colunas = incluirAluno
        ? ["Aluno", "Periodo", "Disciplina", "Pontos", "Total", "Corte", "Situacao"]
        : ["Periodo", "Disciplina", "Avaliacao", "Tipo", "Nota", "Valor", "Data"];
      return {
        colunas,
        larguras: incluirAluno ? [100, 70, 150, 60, 60, 60, 100] : [75, 140, 135, 65, 50, 50, 70],
        linhas: linhas.map((linha) => this.pick(linha, colunas)),
      };
    }

    if (tipo === "Frequencia") {
      const colunas = incluirAluno
        ? ["Aluno", "Disciplina", "Aulas", "Presencas", "Faltas", "Frequencia", "Situacao"]
        : ["Disciplina", "Aulas", "Presencas", "Faltas", "Frequencia", "Situacao"];
      return {
        colunas,
        larguras: incluirAluno ? [120, 150, 55, 75, 55, 80, 95] : [185, 65, 80, 65, 90, 105],
        linhas: linhas.map((linha) => this.pick(linha, colunas)),
      };
    }

    if (tipo === "Consulta") {
      const colunas = ["Aluno", "Periodo", "Disciplina", "Frequencia", "Situacao"];
      return {
        colunas,
        larguras: [150, 95, 170, 95, 105],
        linhas: linhas.map((linha) => this.pick(linha, colunas)),
      };
    }

    const colunas = incluirAluno
      ? ["Aluno", "Periodo", "Disciplina", "Pontos", "Total", "Corte", "Frequencia", "Situacao"]
      : ["Periodo", "Disciplina", "Pontos", "Total", "Corte", "Frequencia", "Situacao"];

    return {
      colunas,
      larguras: incluirAluno ? [85, 65, 130, 55, 55, 55, 70, 90] : [70, 155, 65, 65, 65, 80, 100],
      linhas: linhas.map((linha) => this.pick(linha, colunas)),
    };
  }

  private pick(linha: RelatorioLinhaPdf, colunas: string[]) {
    return colunas.reduce<RelatorioLinhaPdf>((acc, coluna) => {
      acc[coluna] = linha[coluna] ?? "-";
      return acc;
    }, {});
  }

  private situacaoDoResultado(resultado: ResultadoAcademico): SituacaoAcademica {
    if (resultado.aprovacaoDisciplina === "APROVADA") return "Aprovado";
    if (resultado.aprovacaoDisciplina === "NAO_APROVADA") return "Reprovado";
    return resultado.resultadoPorNota === "EM_RECUPERACAO" ? "Recuperacao" : "Pendente";
  }

  private nomeAvaliacao(linha: RelatorioAcademicoLinha) {
    const nome = String(linha.avaliacao ?? "").trim();

    if (nome) {
      return nome;
    }

    return this.labelTipoAvaliacao(linha.tipoAvaliacao) ?? "Avaliacao";
  }

  private labelTipoAvaliacao(tipo?: string | null) {
    const labels: Record<string, string> = {
      REGULAR: "Regular",
      PROVA: "Prova",
      TPI: "TPI",
      TRABALHO: "Trabalho",
      RECUPERACAO: "Recuperacao",
    };

    if (!tipo) {
      return undefined;
    }

    return labels[String(tipo).toUpperCase()] ?? String(tipo);
  }

  private formatarData(data?: string | Date | null) {
    if (!data) {
      return undefined;
    }

    const valor = data instanceof Date ? data : new Date(String(data));

    if (Number.isNaN(valor.getTime())) {
      return String(data);
    }

    return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(valor);
  }

  private formatarInteiro(valor?: number) {
    if (valor === null || valor === undefined) {
      return undefined;
    }

    return String(valor);
  }

  private labelSituacao(situacao: SituacaoAcademica) {
    const labels: Record<SituacaoAcademica, string> = {
      Aprovado: "Aprovado",
      Reprovado: "Reprovado",
      Recuperacao: "Recuperação",
      Pendente: "Pendente",
      Regular: "Regular",
      Atencao: "Atencao",
    };

    return labels[situacao];
  }

}
