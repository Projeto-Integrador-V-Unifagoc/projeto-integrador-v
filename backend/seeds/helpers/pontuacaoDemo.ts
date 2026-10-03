import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { configurarAmbienteTeste } from "../../src/config/ambienteTeste";
import { validarDestinoPostgresTeste } from "../../src/test-helpers/disputaAcademica";
import { RegraPontuacaoRepository } from "../../src/Modules/avaliacao/repository/RegraPontuacaoRepository";

export function exigirDemoIsolada(db: Knex): void {
  if (process.env.ACADEMICO_MODO_TESTE !== "true") throw new Error("Demo sintética exige ACADEMICO_MODO_TESTE=true.");
  configurarAmbienteTeste(); validarDestinoPostgresTeste(db);
}

/** Um seed repetido conserva todos os registros. Pares preexistentes não são convertidos. */
export async function demoJaCriada(db: Knex, cursos: string[], periodo: string, seed: string): Promise<boolean> {
  exigirDemoIsolada(db);
  const regras = await db("piv.regra_pontuacao").whereIn("curso_id", cursos).where({ periodo_letivo_id: periodo });
  if (regras.some((r) => r.origem === "HISTORICA")) throw new Error("Demo não pode sobrescrever regra HISTORICA.");
  if (regras.length === cursos.length) {
    const eventos = await db("piv.regra_pontuacao_auditoria").whereIn("regra_pontuacao_id", regras.map((r) => r.id)).where({ acao: "CRIACAO" });
    if (eventos.length === cursos.length && eventos.every((e) => e.novo?.seed === seed)) return true;
  }
  if (regras.length || await db("piv.curso").whereIn("id", cursos).first("id")) {
    throw new Error("Demo encontrou um par preexistente. Preserve seus dados e use um banco descartável vazio.");
  }
  return false;
}

export async function criarRegraDemo(trx: Knex.Transaction, curso: string, periodo: string,
  usuario: string, total: "100.00" | "120.00", seed: string) {
  const ator = await trx("piv.usuario").where({ id: usuario }).first();
  if (!ator || !["secretaria", "administrador"].includes(ator.tipo_usuario)) throw new Error("Demo exige autor institucional existente.");
  const id = randomUUID();
  await trx("piv.regra_pontuacao").insert({ id, curso_id: curso, periodo_letivo_id: periodo,
    total_pontos: total, origem: "CONFIGURADA", criada_por_usuario_id: usuario, atualizada_por_usuario_id: usuario });
  const definicoes = total === "120.00"
    ? [{ nome: "Atividades da demonstração", orcamento_pontos: "120.00", modo_quantidade: "FIXA", quantidade_fixa: 2, ordem: 0 }]
    : [{ nome: "Provas", orcamento_pontos: "60.00", modo_quantidade: "FIXA", quantidade_fixa: 3, ordem: 0 },
      { nome: "Avaliações institucionais", orcamento_pontos: "5.00", modo_quantidade: "FIXA", quantidade_fixa: 1, ordem: 1 },
      { nome: "Trabalhos e projetos", orcamento_pontos: "35.00", modo_quantidade: "SEM_LIMITE", quantidade_fixa: null, ordem: 2 }];
  const subgrupos = definicoes.map((g) => ({ id: randomUUID(), regra_pontuacao_id: id, ...g }));
  await trx("piv.subgrupo_avaliacao").insert(subgrupos);
  const regra = await new RegraPontuacaoRepository(trx).lerPorPar(curso, periodo, trx);
  await trx("piv.regra_pontuacao_auditoria").insert({ regra_pontuacao_id: id, usuario_id: usuario,
    perfil: ator.tipo_usuario, acao: "CRIACAO", anterior: null, novo: { ...regra, seed }, criado_em: trx.raw("clock_timestamp()") });
  return { id, subgrupos };
}

export async function auditarUsoDemo(trx: Knex.Transaction, oferta: string, usuario: string) {
  const td = await trx("piv.turma_disciplina").where({ id: oferta }).first();
  const r = await trx("piv.regra_pontuacao").where({ id: td.regra_pontuacao_id }).first();
  const ator = await trx("piv.usuario").where({ id: usuario }).first();
  const regra = await new RegraPontuacaoRepository(trx).lerPorPar(r.curso_id, r.periodo_letivo_id, trx);
  await trx("piv.regra_pontuacao_auditoria").insert({ regra_pontuacao_id: r.id, usuario_id: usuario,
    perfil: ator.tipo_usuario, acao: "PRIMEIRO_USO", anterior: null,
    novo: { ...regra, turmaDisciplinaId: oferta }, criado_em: trx.raw("clock_timestamp()") });
}
