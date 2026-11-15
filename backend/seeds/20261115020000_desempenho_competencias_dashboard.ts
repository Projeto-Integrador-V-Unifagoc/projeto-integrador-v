import type { Knex } from "knex";

const SCHEMA = "piv";
const PROFESSORA_DEMO = "prof.helena.duarte@auditoria.unieduca.local";
const DISCIPLINAS_DEMO = ["ADS-ALG-AUD", "ADM-CONT-AUD", "CON-DIR-AUD"];

export async function seed(db: Knex): Promise<void> {
  await db.transaction(async (trx) => {
    const avaliacoes = await trx(`${SCHEMA}.avaliacao as av`)
      .join(`${SCHEMA}.turma_disciplina as td`, "av.turma_disciplina_id", "td.id")
      .join(`${SCHEMA}.curso_disciplina as cd`, "td.curso_disciplina_id", "cd.id")
      .join(`${SCHEMA}.disciplinas as d`, "cd.disciplina_id", "d.id")
      .join(`${SCHEMA}.professor as prof`, "td.professor_id", "prof.id")
      .join(`${SCHEMA}.usuario as u`, "prof.usuario_id", "u.id")
      .where("u.email", PROFESSORA_DEMO)
      .whereIn("d.codigo", DISCIPLINAS_DEMO)
      .select("av.id as avaliacao_id", "d.id as disciplina_id");

    for (const avaliacao of avaliacoes) {
      const competencias = await trx(`${SCHEMA}.disciplina_competencia`)
        .where("disciplina_id", avaliacao.disciplina_id)
        .orderBy("ordem")
        .select("competencia_id");
      if (!competencias.length) continue;

      const pesoBase = Math.floor(10000 / competencias.length) / 100;
      const vinculos = competencias.map((competencia, indice) => ({
        avaliacao_id: avaliacao.avaliacao_id,
        competencia_id: competencia.competencia_id,
        peso_percentual: indice === competencias.length - 1
          ? Number((100 - pesoBase * (competencias.length - 1)).toFixed(2))
          : pesoBase,
      }));
      await trx(`${SCHEMA}.avaliacao_competencia`)
        .insert(vinculos)
        .onConflict(["avaliacao_id", "competencia_id"])
        .merge(["peso_percentual", "updated_at"]);
    }
  });

  console.log("Mapeamento de competências das avaliações da professora de demonstração atualizado.");
}
