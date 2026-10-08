import type { Request } from "express";
import { MatriculaService } from "../../modulo-matricula/service/MatriculaService.js";
import type { MatriculaDetalhada } from "../../modulo-matricula/repository/MatriculaRepository.js";
import { AlunoService } from "../../modulo-gestao-alunos/service/AlunoService.js";
import { FrequenciaService } from "../../frequencia/service/FrequenciaService.js";
import { DocumentoService } from "../../modulo-documentos/service/DocumentoService.js";
import { PeriodoLetivoService } from "../../modulo-estrutura-academica/service/PeriodoLetivoService.js";
import { criarResultadoAcademicoService } from "../../notas/service/criarResultadoAcademicoService";
import type { ResultadoAcademicoService } from "../../notas/service/ResultadoAcademicoService";
import { erroNota } from "../../notas/errors/NotaError";

const SITUACAO_FICHA: Record<string, string> = {
  SUFICIENTE: "aprovado", INSUFICIENTE: "reprovado", EM_RECUPERACAO: "recuperacao",
  EM_ANDAMENTO: "em_andamento", NAO_LANCADA: "nao_lancada",
};

export class FichaService {
  private matriculaService = new MatriculaService();
  private documentoService = new DocumentoService();
  private periodoService = new PeriodoLetivoService();
  private alunoService = new AlunoService();
  private frequenciaService = new FrequenciaService();
  private resultadoService = criarResultadoAcademicoService();

  private expandirPorDisciplina(matriculas: MatriculaDetalhada[],
    lote: Awaited<ReturnType<ResultadoAcademicoService["consultar"]>>) {
    const ofertas = new Map(lote.ofertas.map((oferta) => [oferta.id, oferta]));
    const vinculosPorMatricula = new Map<string, typeof lote.matriculas>();
    for (const vinculo of lote.matriculas) {
      const vinculos = vinculosPorMatricula.get(vinculo.matricula_id) ?? [];
      vinculos.push(vinculo);
      vinculosPorMatricula.set(vinculo.matricula_id, vinculos);
    }
    const data = (matricula: MatriculaDetalhada) => new Date(matricula.data_matricula).getTime() || 0;
    const ordenadas = [...matriculas].sort((a, b) => data(b) - data(a) || a.id.localeCompare(b.id));
    return ordenadas.flatMap((matricula) => {
      const vinculos = [...(vinculosPorMatricula.get(matricula.id) ?? [])].sort((a, b) => {
        const nomeA = String(ofertas.get(a.turma_disciplina_id)?.disciplina_nome ?? "");
        const nomeB = String(ofertas.get(b.turma_disciplina_id)?.disciplina_nome ?? "");
        return nomeA.localeCompare(nomeB, "pt-BR") || a.matricula_turma_disciplina_id.localeCompare(b.matricula_turma_disciplina_id);
      });
      const base = { ...matricula, matricula_id: matricula.id,
        periodo_codigo: matricula.periodo_letivo_codigo, semestre: matricula.turma_sigla };
      if (vinculos.length === 0) return [{ ...base, matricula_turma_disciplina_id: null,
        turma_disciplina_id: null, disciplina_id: null, disciplina_nome: null, professor_nome: null, vinculo_status: null }];
      return vinculos.map((vinculo) => {
        const oferta = ofertas.get(vinculo.turma_disciplina_id)!;
        return { ...base, matricula_turma_disciplina_id: vinculo.matricula_turma_disciplina_id,
          turma_disciplina_id: vinculo.turma_disciplina_id, disciplina_id: oferta.disciplina_id,
          disciplina_nome: oferta.disciplina_nome, professor_nome: oferta.professor_nome, vinculo_status: vinculo.status_matricula };
      });
    });
  }

  async montarFicha(alunoId: string, req?: Request) {
    const user = (req as any)?.user;
    const perfil = typeof user?.tipo_usuario === "string" ? user.tipo_usuario.trim().toLowerCase() : "";
    // Ficha inclui seções pessoais/documentais não filtráveis por oferta.
    // Professor/aluno consultam seu boletim autorizado pelo módulo de notas.
    if (!user?.id || !["secretaria", "administrador"].includes(perfil)) throw erroNota.proibido();
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(alunoId)) {
      throw erroNota.invalido("Identificador do aluno inválido.", "UUID_INVALIDO");
    }
    alunoId = alunoId.toLowerCase();
    const lote = await this.resultadoService.consultar({ alunoId, incluirMatriculasHistoricas: true }, req!);
    if (!["secretaria", "administrador"].includes(lote.contexto.perfil)) throw erroNota.proibido();
    const ofertas = new Map(lote.ofertas.map((o) => [o.id, o]));
    if (lote.matriculas.some((m) => m.aluno_id !== alunoId || !ofertas.has(m.turma_disciplina_id))) {
      throw new Error("Composição da ficha incompatível com o escopo autorizado.");
    }
    // Somente depois da autorização do lote são lidas as seções institucionais.
    const aluno = await this.alunoService.buscarAlunoPorId(alunoId);
    const matriculas = this.expandirPorDisciplina(await this.matriculaService.listarPorAluno(alunoId), lote);
    const frequencia = await this.frequenciaService.consultarAlunoInterno(alunoId);
    const documentos = await this.documentoService.listarPorAluno(alunoId);
    const periodos = await this.periodoService.listarPeriodosLetivos();
    const notas = lote.matriculas.map((matricula) => {
      const oferta = ofertas.get(matricula.turma_disciplina_id)!;
      const resultado = matricula.resultadoAcademico;
      return {
        id: matricula.matricula_turma_disciplina_id, alunoId,
        alunoNome: matricula.aluno_nome ?? aluno?.pessoa?.nome ?? null,
        turmaId: oferta.turma_id ?? null, turmaNome: oferta.turma_sigla ?? oferta.turma_descricao ?? null,
        turmaDisciplinaId: oferta.id, matriculaTurmaDisciplinaId: matricula.matricula_turma_disciplina_id,
        disciplinaId: oferta.disciplina_id ?? null, disciplinaNome: oferta.disciplina_nome ?? null,
        professorId: oferta.professor_id ?? null, professorNome: oferta.professor_nome ?? null,
        periodoLetivoId: oferta.periodo_letivo_id ?? null, periodoLetivo: oferta.periodo_codigo ?? null,
        avaliacoes: oferta.avaliacoes.map((avaliacao) => ({ id: avaliacao.id,
          nome: avaliacao.descricao ?? avaliacao.tipo, tipo: avaliacao.tipo,
          nota: matricula.notas.has(avaliacao.id) ? matricula.notas.get(avaliacao.id)! : null,
          peso: avaliacao.valor, matricula_turma_disciplina_id: matricula.matricula_turma_disciplina_id })),
        resultadoAcademico: resultado,
        // Aliases transitórios do resultado por nota; aprovação conjunta está no DTO.
        media: resultado.percentualResultado, situacao: SITUACAO_FICHA[resultado.resultadoPorNota],
      };
    });
    return { aluno, matriculas, notas, frequencia, documentos, periodos };
  }
}
