import type { ExecutorAcademico } from "../../modulo-estrutura-academica/gateways/TransacaoAcademica";
import type { ContextoNota } from "./AuthContextGateway";
import { erroNota } from "../errors/NotaError";

const ATIVOS = ["ativa", "ATIVA", "ATIVO", "MATRICULADO", "REGULAR"];
const EM_CURSO = [...ATIVOS, "pendente", "PENDENTE"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FiltrosResultadoAcademico {
  ofertaIds?: string[];
  alunoId?: string;
  periodoLetivoId?: string;
  somenteOfertasAtivas?: boolean;
  /** Preserva o histórico da ficha administrativa, inclusive vínculos encerrados. */
  incluirMatriculasHistoricas?: boolean;
}

/** Metadados internos do banco; leitores projetam somente seus envelopes autorizados. */
export interface OfertaResultadoAcademico {
  id: string;
  curso_id: string;
  periodo_letivo_id: string;
  regra_pontuacao_id: string | null;
  [campo: string]: any;
}
export interface MatriculaResultadoAcademico {
  matricula_turma_disciplina_id: string;
  turma_disciplina_id: string;
  aluno_id: string;
  [campo: string]: any;
}
export interface EstruturaResultadoAcademico {
  ofertas: OfertaResultadoAcademico[];
  matriculas: MatriculaResultadoAcademico[];
}

/** Restringe ofertas antes de ler pessoas, notas ou frequência. Não amplia por aluno compartilhado. */
export class EstruturaAcademicaGateway {
  async carregar(filtros: FiltrosResultadoAcademico, ctx: ContextoNota,
    executor: ExecutorAcademico): Promise<EstruturaResultadoAcademico> {
    const validarId = (id: string) => {
      if (typeof id !== "string" || !UUID.test(id)) throw erroNota.invalido("Identificação acadêmica inválida.", "UUID_INVALIDO");
      return id.toLowerCase();
    };
    const ids = filtros.ofertaIds?.map(validarId);
    const alunoId = filtros.alunoId ? validarId(filtros.alunoId) : ctx.alunoId;
    const periodoId = filtros.periodoLetivoId ? validarId(filtros.periodoLetivoId) : undefined;
    if (ctx.perfil === "aluno" && (!ctx.alunoId || alunoId !== ctx.alunoId)) throw erroNota.proibido();
    if (ctx.perfil === "professor" && !ctx.professorId) throw erroNota.proibido();
    if (!["aluno", "professor", "administrador", "secretaria"].includes(ctx.perfil)) throw erroNota.proibido();
    const incluirHistoricas = filtros.incluirMatriculasHistoricas === true;
    if (incluirHistoricas && !["administrador", "secretaria"].includes(ctx.perfil)) {
      throw erroNota.proibido("Consulta histórica restrita ao contexto administrativo.", "ESCOPO_PROIBIDO");
    }
    const consulta = executor("piv.turma_disciplina as td")
      .join("piv.turma as t", "t.id", "td.turma_id")
      .join("piv.periodo_letivo as pl", "pl.id", "t.periodo_letivo_id")
      .join("piv.curso as c", "c.id", "t.curso_id")
      .join("piv.curso_disciplina as cd", "cd.id", "td.curso_disciplina_id")
      .join("piv.disciplinas as d", "d.id", "cd.disciplina_id")
      .leftJoin("piv.professor as prof", "prof.id", "td.professor_id")
      .leftJoin("piv.pessoa as pp", "pp.id", "prof.pessoa_id")
      .select("td.id", "td.status", "td.professor_id", "td.regra_pontuacao_id", "td.pontuacao_vinculada_em",
        "t.id as turma_id", "t.sigla as turma_sigla", "t.descricao as turma_descricao", "t.status as turma_status",
        "t.curso_id", "c.nome as curso_nome", "cd.curso_id as matriz_curso_id", "cd.id as curso_disciplina_id",
        "pl.id as periodo_letivo_id", "pl.id as periodo_id", "pl.codigo as periodo_codigo",
        "pl.status as periodo_status", "pl.ativo as periodo_ativo", "pl.ano", "pl.semestre", "d.id as disciplina_id", "cd.carga_horaria",
        "d.codigo as disciplina_codigo", "d.nome as disciplina_nome", "pp.nome as professor_nome")
      .orderBy(["pl.codigo", "t.sigla", "d.nome", "td.id"]);
    if (ids) consulta.whereIn("td.id", ids);
    if (periodoId) consulta.where("pl.id", periodoId);
    if (ctx.perfil === "professor") consulta.where("td.professor_id", ctx.professorId!)
      .where("prof.ativo", true).whereIn("td.status", ATIVOS);
    if (filtros.somenteOfertasAtivas) consulta.whereIn("td.status", ATIVOS);
    if (alunoId) {
      const escopo = executor("piv.matricula_turma_disciplina as escopo")
        .join("piv.matricula as me", "me.id", "escopo.matricula_id")
        .select(executor.raw("1")).whereRaw("escopo.turma_disciplina_id = td.id")
        .where("me.aluno_id", alunoId);
      if (!incluirHistoricas) escopo.whereIn("escopo.status", ATIVOS).whereIn("me.status", EM_CURSO);
      consulta.whereExists(escopo);
    }
    const ofertas = await consulta as OfertaResultadoAcademico[];
    if (ids && new Set(ofertas.map((o) => o.id)).size !== new Set(ids).size) {
      if (["professor", "aluno"].includes(ctx.perfil)) throw erroNota.proibido("Oferta fora do seu escopo.", "ESCOPO_PROIBIDO");
      throw erroNota.naoEncontrado("Oferta não encontrada no contexto solicitado.");
    }
    if (ctx.perfil === "professor" && alunoId && ofertas.length === 0) {
      throw erroNota.proibido("Aluno fora das atribuições do professor.", "ESCOPO_PROIBIDO");
    }
    if (ofertas.some((o) => o.curso_id !== o.matriz_curso_id)) throw new Error("Estrutura acadêmica incompatível.");
    if (ofertas.length === 0) return { ofertas, matriculas: [] };
    const matriculasQuery = executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "m.id", "mtd.matricula_id")
      .join("piv.aluno as a", "a.id", "m.aluno_id")
      .join("piv.pessoa as p", "p.id", "a.pessoa_id")
      .whereIn("mtd.turma_disciplina_id", ofertas.map((o) => o.id))
      .select("mtd.id as matricula_turma_disciplina_id", "mtd.turma_disciplina_id",
        "mtd.status as status_matricula", "m.id as matricula_id", "a.id as aluno_id",
        "a.matricula", "p.nome as aluno_nome").orderBy(["p.nome", "mtd.id"]);
    if (alunoId) matriculasQuery.where("a.id", alunoId);
    if (!incluirHistoricas) matriculasQuery.whereIn("mtd.status", ATIVOS).whereIn("m.status", EM_CURSO);
    const matriculas = await matriculasQuery as MatriculaResultadoAcademico[];
    const irregularesQuery = executor("piv.matricula_turma_disciplina as mtd")
      .join("piv.matricula as m", "m.id", "mtd.matricula_id")
      .whereIn("mtd.turma_disciplina_id", ofertas.map((o) => o.id))
      .where((q) => q.whereNotIn("mtd.status", ATIVOS).orWhereNotIn("m.status", EM_CURSO))
      .select("mtd.turma_disciplina_id").count("mtd.id as total").groupBy("mtd.turma_disciplina_id");
    if (alunoId) irregularesQuery.where("m.aluno_id", alunoId);
    const irregulares = await irregularesQuery;
    const porOferta = new Map(irregulares.map((i) => [String(i.turma_disciplina_id), Number(i.total)]));
    return { ofertas: ofertas.map((o) => ({ ...o, matriculas_irregulares: porOferta.get(o.id) ?? 0 })), matriculas };
  }
}
