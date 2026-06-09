import { Knex } from "knex";

const SCHEMA = "piv";

export async function seed(knex: Knex): Promise<void> {
  // Get existing data
  const matriculas = await knex(`${SCHEMA}.matricula`).select("id");
  const turmaDisciplinas = await knex(`${SCHEMA}.turma_disciplina`).select("id");

  console.log(`📝 Matrículas encontradas: ${matriculas.length}`);
  console.log(`📝 Turma-Disciplinas encontradas: ${turmaDisciplinas.length}`);

  if (matriculas.length > 0 && turmaDisciplinas.length > 0) {
    // Criar associações entre matriculas e turma_disciplinas
    for (let i = 0; i < Math.min(matriculas.length * 2, 20); i++) {
      const matriculaId = matriculas[i % matriculas.length].id;
      const turmaDisciplinaId = turmaDisciplinas[i % turmaDisciplinas.length].id;

      try {
        await knex(`${SCHEMA}.matricula_turma_disciplina`).insert({
          id: `cccccccc-cccc-cccc-${String(i).padStart(4, "0")}-${String(i).padStart(12, "0")}`,
          matricula_id: matriculaId,
          turma_disciplina_id: turmaDisciplinaId,
          status: "ativa",
        }).onConflict("id").ignore();

        console.log(`✅ Vinculação ${i + 1} inserida`);
      } catch (e: any) {
        console.log(`⚠️ Vinculação ${i + 1} erro: ${e.message?.substring(0, 50)}`);
      }
    }
  } else {
    console.log("⚠️ Não há matrículas ou turma-disciplinas para vincular");
  }

  // Verify counts
  const mtdCount = await knex(`${SCHEMA}.matricula_turma_disciplina`).count("* as total").first();
  console.log(`\n✅ Total de matricula_turma_disciplina: ${mtdCount?.total || 0}`);
}
