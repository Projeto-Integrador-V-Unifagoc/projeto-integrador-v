import { ConsolidadoFrequencia } from "../../frequencia/models/Frequencia";
import { FrequenciaService } from "../../frequencia/service/FrequenciaService";
import { NotaMock, SituacaoNotaMock } from "../../notas/models/NotaMock";
import { NotasMockService } from "../../notas/service/NotasMockService";
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

interface LinhaIntegrada extends RelatorioAcademicoLinha {
  chaveNomeDisciplina: string;
}

const CURSO_POR_TURMA: Record<string, string> = {
  "turma-ads-2026-1": "Analise e Desenvolvimento de Sistemas",
  "turma-ads-bd-2026-1": "Analise e Desenvolvimento de Sistemas",
  "turma-si-2026-1": "Sistemas de Informacao",
};

export class RelatorioService {
  private repository = new RelatorioRepository();
  private notasService = new NotasMockService();
  private frequenciaService = new FrequenciaService();

  async listarRelatorios(filtros: FiltrosRelatorioAcademico) {
    const linhasIntegradas = await this.listarLinhasIntegradas(filtros);
    const linhas = linhasIntegradas.length
      ? linhasIntegradas
      : await this.repository.listarLinhasAcademicas(filtros);

    return this.montarRelatorios(linhas, filtros);
  }

  private async listarLinhasIntegradas(filtros: FiltrosRelatorioAcademico): Promise<LinhaIntegrada[]> {
    const notas = this.filtrarNotas(this.notasService.listarTodos(), filtros);
    const relatorioFrequencia = await this.frequenciaService.gerarRelatorio({
      turmaDisciplinaId: filtros.turmaId,
    });
    const frequencias = this.filtrarFrequencias(relatorioFrequencia.alunos ?? [], filtros);
    const frequenciasPorChave = new Map<string, ConsolidadoFrequencia>();

    frequencias.forEach((frequencia) => {
      frequenciasPorChave.set(this.chaveFrequencia(frequencia), frequencia);
      frequenciasPorChave.set(this.chaveNomeDisciplina(frequencia.alunoNome, frequencia.disciplinaNome), frequencia);
    });

    const linhas = notas.map((nota) => {
      const frequencia =
        frequenciasPorChave.get(this.chaveNota(nota)) ??
        frequenciasPorChave.get(this.chaveNomeDisciplina(nota.alunoNome, nota.disciplinaNome));

      return this.montarLinhaPorNota(nota, frequencia);
    });

    frequencias.forEach((frequencia) => {
      const jaExiste = linhas.some(
        (linha) =>
          linha.alunoId === frequencia.alunoId &&
          (linha.disciplinaId === frequencia.disciplinaId ||
            linha.chaveNomeDisciplina === this.chaveNomeDisciplina(frequencia.alunoNome, frequencia.disciplinaNome))
      );

      if (!jaExiste) {
        linhas.push(this.montarLinhaPorFrequencia(frequencia));
      }
    });

    return linhas;
  }

  private filtrarNotas(notas: NotaMock[], filtros: FiltrosRelatorioAcademico) {
    return notas.filter((nota) => {
      const anoValido = !filtros.ano || filtros.ano === "Todos" || nota.periodoLetivo === filtros.ano;
      const alunoValido = !filtros.alunoId || nota.alunoId === filtros.alunoId;
      const turmaValida = !filtros.turmaId || nota.turmaId === filtros.turmaId;
      const disciplinaValida = !filtros.disciplinaId || nota.disciplinaId === filtros.disciplinaId;
      return anoValido && alunoValido && turmaValida && disciplinaValida;
    });
  }

  private filtrarFrequencias(frequencias: ConsolidadoFrequencia[], filtros: FiltrosRelatorioAcademico) {
    return frequencias.filter((frequencia) => {
      const alunoValido = !filtros.alunoId || frequencia.alunoId === filtros.alunoId;
      const turmaValida = !filtros.turmaId || frequencia.turmaDisciplinaId === filtros.turmaId;
      const disciplinaValida = !filtros.disciplinaId || frequencia.disciplinaId === filtros.disciplinaId;
      return alunoValido && turmaValida && disciplinaValida;
    });
  }

  private montarLinhaPorNota(nota: NotaMock, frequencia?: ConsolidadoFrequencia): LinhaIntegrada {
    const ano = nota.periodoLetivo;

    return {
      alunoId: nota.alunoId,
      matricula: nota.alunoId.replace(/\D/g, "") || nota.alunoId,
      aluno: nota.alunoNome,
      cursoId: this.cursoIdPorTurma(nota.turmaId),
      curso: CURSO_POR_TURMA[nota.turmaId] ?? "Curso nao informado",
      periodo: nota.turmaNome,
      turmaId: nota.turmaId,
      disciplinaId: nota.disciplinaId,
      disciplina: nota.disciplinaNome,
      cargaHoraria: 80,
      ano,
      nota: nota.media,
      frequencia: frequencia?.percentual,
      totalAulas: frequencia?.totalAulas,
      presencas: frequencia?.presencas,
      faltas: frequencia?.faltas,
      situacao: this.situacaoPorNotaEFrequencia(nota.situacao, frequencia),
      chaveNomeDisciplina: this.chaveNomeDisciplina(nota.alunoNome, nota.disciplinaNome),
    };
  }

  private montarLinhaPorFrequencia(frequencia: ConsolidadoFrequencia): LinhaIntegrada {
    return {
      alunoId: frequencia.alunoId,
      matricula: frequencia.alunoId.replace(/\D/g, "") || frequencia.alunoId,
      aluno: frequencia.alunoNome,
      cursoId: this.cursoIdPorTurma(frequencia.turmaDisciplinaId),
      curso: CURSO_POR_TURMA[frequencia.turmaDisciplinaId] ?? "Curso nao informado",
      periodo: this.periodoPorTurma(frequencia.turmaDisciplinaId),
      turmaId: frequencia.turmaDisciplinaId,
      disciplinaId: frequencia.disciplinaId,
      disciplina: frequencia.disciplinaNome,
      cargaHoraria: 80,
      ano: "2026/1",
      frequencia: frequencia.percentual,
      totalAulas: frequencia.totalAulas,
      presencas: frequencia.presencas,
      faltas: frequencia.faltas,
      situacao: this.normalizarSituacaoFrequencia(frequencia.situacao),
      chaveNomeDisciplina: this.chaveNomeDisciplina(frequencia.alunoNome, frequencia.disciplinaNome),
    };
  }

  private montarRelatorios(
    linhasOriginais: RelatorioAcademicoLinha[],
    filtros: FiltrosRelatorioAcademico
  ): RelatorioItem[] {
    const perfil = filtros.perfil ?? "Professor";
    const termo = filtros.busca?.trim().toLowerCase() ?? "";
    const linhas = linhasOriginais.filter((linha) => this.linhaPassaNosFiltros(linha, filtros, termo));
    const anos = Array.from(new Set(linhas.map((linha) => String(linha.ano || "Atual"))));
    const relatorios: RelatorioItem[] = [];

    anos.forEach((ano, anoIndex) => {
      const linhasDoAno = linhas.filter((linha) => String(linha.ano || "Atual") === ano);
      const cursos = Array.from(new Set(linhasDoAno.map((linha) => linha.curso || "Curso nao informado")));

      cursos.forEach((curso, cursoIndex) => {
        const linhasDoCurso = linhasDoAno.filter((linha) => (linha.curso || "Curso nao informado") === curso);
        const baseId = anoIndex * 100 + cursoIndex * 10;

        relatorios.push(
          this.criarRelatorio(baseId + 1, "Notas", perfil, ano, curso, this.montarPeriodos(linhasDoCurso, perfil, "Notas")),
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

        if (perfil === "Professor") {
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
    });

    return relatorios.filter((relatorio) => {
      const tipoValido = !filtros.tipo || filtros.tipo === "Todos" || relatorio.tipo === filtros.tipo;
      return tipoValido && relatorio.periodos.some((periodo) => periodo.disciplinas.length > 0);
    });
  }

  private linhaPassaNosFiltros(
    linha: RelatorioAcademicoLinha,
    filtros: FiltrosRelatorioAcademico,
    termo: string
  ) {
    const anoValido = !filtros.ano || filtros.ano === "Todos" || String(linha.ano) === filtros.ano;

    if (!anoValido) {
      return false;
    }

    if (!termo) {
      return true;
    }

    return [
      linha.aluno,
      linha.curso,
      linha.periodo,
      linha.disciplina,
      linha.situacao ?? "",
    ].some((campo) => String(campo).toLowerCase().includes(termo));
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
          aluno: perfil === "Professor" ? linha.aluno : undefined,
          cargaHoraria: `${linha.cargaHoraria ?? 0}h`,
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
    const incluirAluno = perfil === "Professor";
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
        rodape: "Relatorio gerado a partir dos dados mockados integrados do modulo academico.",
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
          : "Historico academico completo para acompanhamento docente.",
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
        "Carga Horaria": disciplina.cargaHoraria,
        Nota: disciplina.nota ?? "-",
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
        ? ["Aluno", "Periodo", "Disciplina", "Nota", "Situacao"]
        : ["Periodo", "Disciplina", "Nota", "Situacao"];
      return {
        colunas,
        larguras: incluirAluno ? [130, 95, 175, 70, 110] : [110, 245, 80, 125],
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

  private situacaoPorNotaEFrequencia(situacaoNota: SituacaoNotaMock, frequencia?: ConsolidadoFrequencia) {
    if (frequencia?.situacao === "RISCO_REPROVACAO") return "Pendente";
    if (frequencia?.situacao === "ALERTA") return "Atencao";
    if (situacaoNota === "reprovado") return "Pendente";
    if (situacaoNota === "recuperacao") return "Recuperacao";
    return "Aprovado";
  }

  private normalizarSituacaoFrequencia(situacao: ConsolidadoFrequencia["situacao"]) {
    if (situacao === "RISCO_REPROVACAO") return "Pendente";
    if (situacao === "ALERTA") return "Atencao";
    return "Regular";
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

  private chaveNota(nota: NotaMock) {
    return `${nota.alunoId}:${nota.disciplinaId}`;
  }

  private chaveFrequencia(frequencia: ConsolidadoFrequencia) {
    return `${frequencia.alunoId}:${frequencia.disciplinaId}`;
  }

  private chaveNomeDisciplina(alunoNome: string, disciplinaNome: string) {
    return `${this.normalizarTexto(alunoNome)}:${this.normalizarTexto(disciplinaNome)}`;
  }

  private normalizarTexto(texto: string) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  private cursoIdPorTurma(turmaId: string) {
    if (turmaId.includes("si")) {
      return "curso-si";
    }

    return "curso-ads";
  }

  private periodoPorTurma(turmaId: string) {
    if (turmaId.includes("si")) {
      return "SI 5o Periodo";
    }

    return "ADS 5o Periodo";
  }
}
