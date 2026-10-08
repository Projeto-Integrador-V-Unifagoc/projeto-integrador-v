import type { Knex } from "knex";
import { transacaoAcademica, type AlvosAcademicos, type ClasseAlvoAcademico } from "./TransacaoAcademica";

export type EntidadeEstrutura = "curso" | "disciplinas" | "periodo_letivo" | "turma" | "curso_disciplina" | "turma_disciplina" | "professor" | "matricula" | "matricula_turma_disciplina";
const classes: Record<EntidadeEstrutura, ClasseAlvoAcademico> = {
  curso: "cursos", disciplinas: "disciplinas", periodo_letivo: "periodos", turma: "turmas",
  curso_disciplina: "cursosDisciplinas", turma_disciplina: "ofertas", professor: "professores",
  matricula: "matriculas", matricula_turma_disciplina: "matriculasDisciplinas",
};
export class EstruturaPreservada extends Error {
  readonly status = 409;
  readonly codigo = "ESTRUTURA_PRESERVADA";
  constructor(mensagem = "Este vínculo acadêmico possui histórico preservado e não pode ser reinterpretado ou excluído.") { super(mensagem); }
}
export class ValidacaoEstrutura extends Error {
  readonly status = 400;
  readonly codigo = "DADOS_ACADEMICOS_INVALIDOS";
}

export async function escritaVinculosDocentes<T>(banco: Knex, usuarioId: string, operacao: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
  return transacaoAcademica(banco, { escritaPais: ["professores"], descobrir: async (trx) => {
    const professores = await trx("piv.professor").where({ usuario_id: usuarioId }).select("id");
    const alvos: AlvosAcademicos = {};
    for (const professor of professores) {
      const relacionados = await descobrirEstrutura(trx, "professor", professor.id);
      for (const classe of Object.keys(relacionados) as ClasseAlvoAcademico[]) {
        alvos[classe] = [...(alvos[classe] ?? []), ...(relacionados[classe] ?? [])];
      }
    }
    return alvos;
  } }, (trx) => operacao(trx));
}

/** Descobre os pais e reenumera filhas; o protocolo repete a descoberta após todos os locks. */
export async function descobrirEstrutura(trx: Knex.Transaction, entidade: EntidadeEstrutura, id: string,
  novos: Record<string, unknown> = {}): Promise<AlvosAcademicos> {
  let oferta = trx("piv.turma_disciplina as td").join("piv.turma as t", "td.turma_id", "t.id")
    .join("piv.curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
    .select("td.id", "td.professor_id", "td.turma_id", "td.curso_disciplina_id", "t.periodo_letivo_id", "t.curso_id", "cd.disciplina_id");
  const coluna: Partial<Record<EntidadeEstrutura, string>> = { curso: "t.curso_id", disciplinas: "cd.disciplina_id",
    periodo_letivo: "t.periodo_letivo_id", turma: "t.id", curso_disciplina: "cd.id", turma_disciplina: "td.id", professor: "td.professor_id" };
  if (entidade === "matricula" || entidade === "matricula_turma_disciplina") {
    const vinculos = trx("piv.matricula_turma_disciplina").select("turma_disciplina_id")
      .where(entidade === "matricula" ? "matricula_id" : "id", id);
    oferta = oferta.whereIn("td.id", vinculos);
  } else oferta = oferta.where(coluna[entidade]!, id);
  if (Array.isArray(novos.ofertasAdicionais)) oferta = oferta.orWhereIn("td.id", novos.ofertasAdicionais);
  const ofertas = await oferta;
  const idsOfertas = ofertas.map((r) => r.id);
  const matriculasDisciplinas = await trx("piv.matricula_turma_disciplina").whereIn("turma_disciplina_id", idsOfertas).select("id", "matricula_id");
  const avaliacoes = await trx("piv.avaliacao").whereIn("turma_disciplina_id", idsOfertas).select("id");
  const idsAvaliacoes = avaliacoes.map((r) => r.id);
  const notas = await trx("piv.nota").whereIn("avaliacao_id", idsAvaliacoes).select("id");
  const autorizacoes = await trx("piv.nota_autorizacao_excepcional").whereIn("avaliacao_id", idsAvaliacoes).select("id");
  const atual = await trx(`piv.${entidade}`).where({ id }).first();
  const alvos: AlvosAcademicos = {
    periodos: ofertas.map((r) => r.periodo_letivo_id), turmas: ofertas.map((r) => r.turma_id),
    cursosDisciplinas: ofertas.map((r) => r.curso_disciplina_id), professores: ofertas.map((r) => r.professor_id).filter(Boolean),
    ofertas: idsOfertas, avaliacoes: idsAvaliacoes, matriculas: matriculasDisciplinas.map((r) => r.matricula_id),
    matriculasDisciplinas: matriculasDisciplinas.map((r) => r.id), notas: notas.map((r) => r.id), autorizacoes: autorizacoes.map((r) => r.id),
  };
  alvos[classes[entidade]] = [...(alvos[classes[entidade]] ?? []), id];
  for (const registro of [atual, novos]) {
    if (!registro) continue;
    for (const [campo, classe] of [["curso_id", "cursos"], ["disciplina_id", "disciplinas"], ["periodo_letivo_id", "periodos"], ["turma_id", "turmas"],
      ["curso_disciplina_id", "cursosDisciplinas"], ["professor_id", "professores"], ["matricula_id", "matriculas"]] as const) {
      if (typeof registro[campo] === "string") alvos[classe] = [...(alvos[classe] ?? []), registro[campo]];
    }
  }
  // Turmas/matrizes sem ofertas também precisam ser protegidas antes de uma cascata.
  if (["curso", "periodo_letivo"].includes(entidade)) {
    const turmas = await trx("piv.turma").where(entidade === "curso" ? "curso_id" : "periodo_letivo_id", id).select("id");
    alvos.turmas = [...(alvos.turmas ?? []), ...turmas.map((r) => r.id)];
  }
  if (["curso", "disciplinas"].includes(entidade)) {
    const matrizes = await trx("piv.curso_disciplina").where(entidade === "curso" ? "curso_id" : "disciplina_id", id).select("id");
    alvos.cursosDisciplinas = [...(alvos.cursosDisciplinas ?? []), ...matrizes.map((r) => r.id)];
  }
  const turmasAlvo = await trx("piv.turma").whereIn("id", [...(alvos.turmas ?? [])]).select("periodo_letivo_id", "curso_id");
  alvos.periodos = [...(alvos.periodos ?? []), ...turmasAlvo.map((r) => r.periodo_letivo_id)];
  alvos.cursos = [...(alvos.cursos ?? []), ...turmasAlvo.map((r) => r.curso_id)];
  const matrizesAlvo = await trx("piv.curso_disciplina").whereIn("id", [...(alvos.cursosDisciplinas ?? [])]).select("curso_id", "disciplina_id");
  alvos.cursos = [...(alvos.cursos ?? []), ...matrizesAlvo.map((r) => r.curso_id)];
  alvos.disciplinas = [...(alvos.disciplinas ?? []), ...matrizesAlvo.map((r) => r.disciplina_id)];
  return alvos;
}

export async function escritaEstrutura<T>(banco: Knex, entidade: EntidadeEstrutura, id: string,
  novos: object, operacao: (trx: Knex.Transaction) => Promise<T>, excluir = false): Promise<T> {
  const alteracoes = novos as Record<string, unknown>;
  try {
    return await transacaoAcademica(banco, { descobrir: (trx) => descobrirEstrutura(trx, entidade, id, alteracoes),
      escritaPais: [classes[entidade]] }, async (trx, alvos) => {
      const atual = await trx(`piv.${entidade}`).where({ id }).first();
      const ofertas = await trx("piv.turma_disciplina").whereIn("id", [...(alvos.ofertas ?? [])]);
      const preservadas = ofertas.some((o) => o.regra_pontuacao_id !== null || o.pontuacao_vinculada_em !== null);
      const identidades: Partial<Record<EntidadeEstrutura, string[]>> = {
        turma: ["curso_id", "periodo_letivo_id"], curso_disciplina: ["curso_id", "disciplina_id"],
        turma_disciplina: ["turma_id", "curso_disciplina_id"],
      };
      if (preservadas && (excluir || (identidades[entidade] ?? []).some((campo) => alteracoes[campo] !== undefined && alteracoes[campo] !== atual?.[campo]))) {
        throw new EstruturaPreservada();
      }
      if (excluir && ["curso", "periodo_letivo"].includes(entidade)) {
        const regras = await trx("piv.regra_pontuacao").where(entidade === "curso" ? "curso_id" : "periodo_letivo_id", id).first("id");
        if (regras) throw new EstruturaPreservada();
      }
      return operacao(trx);
    });
  } catch (erro) {
    const codigo = (erro as { code?: string })?.code;
    if (codigo === "23503" || codigo === "23514" || codigo === "P0001") throw new EstruturaPreservada();
    throw erro;
  }
}
