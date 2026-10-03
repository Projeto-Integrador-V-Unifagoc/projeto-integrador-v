import type { Request } from "express";
import { db } from "../../../database/connection";
import type { FiltrosRelatorioAcademico } from "../models/RelatorioAcademico";
import { criarResultadoAcademicoService } from "../../notas/service/criarResultadoAcademicoService";
import { erroNota } from "../../notas/errors/NotaError";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class RelatorioRepository {
  private readonly resultadoService = criarResultadoAcademicoService();

  /** Uma consulta comum autoriza o lote antes de carregar notas/frequência. */
  async carregarResultadoAcademico(filtros: FiltrosRelatorioAcademico, req: Request) {
    const validarId = (valor: unknown) => {
      if (valor === undefined) return undefined;
      if (typeof valor !== "string" || !UUID.test(valor)) throw erroNota.invalido("Identificação acadêmica inválida.", "UUID_INVALIDO");
      return valor.toLowerCase();
    };
    const alunoId = validarId(filtros.alunoId), ofertaId = validarId(filtros.turmaId);
    validarId(filtros.cursoId); validarId(filtros.disciplinaId);
    const periodoLetivoId = validarId(filtros.periodoLetivoId);
    for (const campo of ["busca", "ano", "tipo", "matricula"] as const) {
      if (filtros[campo] !== undefined && typeof filtros[campo] !== "string") {
        throw erroNota.invalido("Filtro acadêmico inválido.", "FILTRO_INVALIDO");
      }
    }
    return this.resultadoService.consultar({
      ...(alunoId ? { alunoId } : {}), ...(ofertaId ? { ofertaIds: [ofertaId] } : {}),
      ...(periodoLetivoId ? { periodoLetivoId } : {}),
    }, req);
  }

  async contarFontesAcademicas() {
    const tabelas = ["aluno", "professor", "matricula", "turma_disciplina", "avaliacao", "nota", "aula", "frequencia"];
    const pares = await Promise.all(tabelas.map(async tabela => {
      const resultado = await db(tabela).count<{ total: string }>("id as total");
      return [tabela, Number(resultado[0]?.total ?? 0)] as const;
    }));
    return Object.fromEntries(pares);
  }
}
