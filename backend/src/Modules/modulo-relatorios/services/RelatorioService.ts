import {
  ContextoRelatorioAcademico,
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

  async listarRelatorios(filtros: FiltrosRelatorioAcademico, contexto?: ContextoRelatorioAcademico) {
    const filtrosSeguros = await this.aplicarContextoAutenticado(filtros, contexto);
    const filtrosConsulta = { ...filtrosSeguros, busca: undefined };
    const [linhas, notasDetalhadas] = await Promise.all([
      this.repository.listarLinhasAcademicas(filtrosConsulta),
      this.repository.listarNotasDetalhadas(filtrosConsulta),
    ]);
    return this.montarRelatorios(linhas, filtrosSeguros, notasDetalhadas);
  }

  async obterStatusFonteDados() {
    return {
      source: "database",
      schema: "piv",
      tabelas: await this.repository.contarFontesAcademicas(),
    };
  }

  private async aplicarContextoAutenticado(
    filtros: FiltrosRelatorioAcademico,
    contexto?: ContextoRelatorioAcademico
  ): Promise<FiltrosRelatorioAcademico> {
    if (!contexto) {
      return filtros;
    }

    const perfil = this.perfilRelatorioPorUsuario(contexto.tipoUsuario);
    const filtrosSeguros: FiltrosRelatorioAcademico = {
      ...filtros,
      perfil,
    };

    if (perfil === "Aluno") {
      const aluno = await this.repository.buscarAlunoPorUsuarioId(contexto.usuarioId);
      filtrosSeguros.alunoId = aluno?.id ?? "__sem_vinculo__";
      filtrosSeguros.turmaId = undefined;
      filtrosSeguros.turmaIdsPermitidos = undefined;
      return filtrosSeguros;
    }

    if (perfil === "Professor") {
      let professor: any;

      professor = await this.repository.buscarProfessorPorUsuarioId(contexto.usuarioId);

      if (!professor?.id) {
        return {
          ...filtrosSeguros,
          turmaId: "__sem_vinculo__",
          turmaIdsPermitidos: ["__sem_vinculo__"],
        };
      }

      const turmas = await this.repository.listarTurmasDisciplinaDoProfessor(professor.id);
      const turmaIdsPermitidos = turmas.map((turma: any) => turma.id).filter(Boolean);

      if (filtros.turmaId && !turmaIdsPermitidos.includes(filtros.turmaId)) {
        return {
          ...filtrosSeguros,
          turmaId: "__sem_acesso__",
          turmaIdsPermitidos: ["__sem_acesso__"],
        };
      }

      return {
        ...filtrosSeguros,
        turmaIdsPermitidos: turmaIdsPermitidos.length ? turmaIdsPermitidos : ["__sem_vinculo__"],
      };
    }

    return filtrosSeguros;
  }

  private perfilRelatorioPorUsuario(tipoUsuario: ContextoRelatorioAcademico["tipoUsuario"]): PerfilRelatorio {
    if (tipoUsuario === "aluno") {
      return "Aluno";
    }

    if (tipoUsuario === "professor") {
      return "Professor";
    }

    return "Secretaria";
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
      const [ano, curso] = chave.split("||");
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
    return `${String(linha.ano || "Atual")}||${linha.curso || "Curso nao informado"}`;
  }

  private montarPeriodos(
    linhas: RelatorioAcademicoLinha[],
    perfil: PerfilRelatorio,
    tipo: TipoRelatorio
  ): PeriodoRelatorio[] {
    const grupos = new Map<string, DisciplinaRelatorio[]>();

    linhas
      .filter((linha) => {
        if (tipo === "Notas") return linha.nota !== null && linha.nota !== undefined;
        if (tipo === "Frequencia") return linha.frequencia !== null && linha.frequencia !== undefined;
        return true;
      })
      .forEach((linha) => {
        const periodo = linha.periodo || linha.ano || "Periodo nao informado";
        const disciplinas = grupos.get(periodo) ?? [];

        disciplinas.push({
          nome: linha.disciplina || "Sem disciplina vinculada",
          aluno: perfil !== "Aluno" ? linha.aluno : undefined,
          cargaHoraria: `${linha.cargaHoraria ?? 0}h`,
          avaliacao: this.nomeAvaliacao(linha),
          tipoAvaliacao: this.labelTipoAvaliacao(linha.tipoAvaliacao),
          valorAvaliacao: this.formatarNota(linha.valorAvaliacao),
          dataAvaliacao: this.formatarData(linha.dataAvaliacao),
          nota: this.formatarNota(linha.nota),
          frequencia: this.formatarFrequencia(linha.frequencia),
          totalAulas: this.formatarInteiro(linha.totalAulas),
          presencas: this.formatarInteiro(linha.presencas),
          faltas: this.formatarInteiro(linha.faltas),
          situacao: this.normalizarSituacao(linha.situacao, linha.nota, linha.frequencia),
        });

        grupos.set(periodo, disciplinas);
      });

    return Array.from(grupos.entries()).map(([nome, disciplinas]) => ({
      nome,
      disciplinas,
    }));
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
        Media: disciplina.nota ?? "-",
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
        ? ["Aluno", "Periodo", "Disciplina", "Media", "Situacao"]
        : ["Periodo", "Disciplina", "Avaliacao", "Tipo", "Nota", "Valor", "Data"];
      return {
        colunas,
        larguras: incluirAluno ? [150, 80, 190, 70, 110] : [75, 140, 135, 65, 50, 50, 70],
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
      ? ["Aluno", "Periodo", "Disciplina", "Carga Horaria", "Nota", "Frequencia", "Situacao"]
      : ["Periodo", "Disciplina", "Carga Horaria", "Nota", "Frequencia", "Situacao"];

    return {
      colunas,
      larguras: incluirAluno ? [100, 75, 135, 85, 55, 75, 80] : [80, 165, 95, 60, 80, 95],
      linhas: linhas.map((linha) => this.pick(linha, colunas)),
    };
  }

  private pick(linha: RelatorioLinhaPdf, colunas: string[]) {
    return colunas.reduce<RelatorioLinhaPdf>((acc, coluna) => {
      acc[coluna] = linha[coluna] ?? "-";
      return acc;
    }, {});
  }

  private normalizarSituacao(
    situacao: RelatorioAcademicoLinha["situacao"],
    nota: RelatorioAcademicoLinha["nota"],
    frequencia: RelatorioAcademicoLinha["frequencia"]
  ): SituacaoAcademica {
    const valor = String(situacao ?? "").toLowerCase();

    if (valor.includes("risco") || valor.includes("reprov")) {
      return "Pendente";
    }

    if (valor.includes("alert") || valor.includes("recuper")) {
      return "Atencao";
    }

    if (valor.includes("aprov") || valor.includes("regular")) {
      return "Aprovado";
    }

    const notaNumerica = Number(String(nota ?? "").replace(",", "."));
    const frequenciaNumerica = Number(String(frequencia ?? "").replace(",", "."));

    if (!Number.isNaN(frequenciaNumerica) && frequenciaNumerica < 75) {
      return "Pendente";
    }

    if (!Number.isNaN(notaNumerica) && notaNumerica < 6) {
      return "Recuperacao";
    }

    if (!Number.isNaN(frequenciaNumerica) && frequenciaNumerica <= 80) {
      return "Atencao";
    }

    return "Aprovado";
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

    return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(valor);
  }

  private formatarNota(nota: RelatorioAcademicoLinha["nota"]) {
    if (nota === null || nota === undefined || nota === "") {
      return undefined;
    }

    const numero = Number(String(nota).replace(",", "."));
    return Number.isNaN(numero) ? String(nota) : numero.toFixed(1).replace(".", ",");
  }

  private formatarFrequencia(frequencia: RelatorioAcademicoLinha["frequencia"]) {
    if (frequencia === null || frequencia === undefined || frequencia === "") {
      return undefined;
    }

    const texto = String(frequencia);
    if (texto.includes("%")) {
      return texto;
    }

    const numero = Number(texto.replace(",", "."));
    return Number.isNaN(numero) ? texto : `${numero.toFixed(0)}%`;
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
      Recuperacao: "Recuperacao",
      Pendente: "Pendente",
      Regular: "Regular",
      Atencao: "Atencao",
    };

    return labels[situacao];
  }

}
