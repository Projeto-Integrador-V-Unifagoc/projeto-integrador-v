import { Knex } from "knex";

const SCHEMA = "piv";

export async function seed(knex: Knex): Promise<void> {
  // Get existing IDs
  const alunos = await knex(`${SCHEMA}.aluno`).select("id", "curso_id");
  const turmas = await knex(`${SCHEMA}.turma`).select("id", "curso_id");
  const turmaDisciplinas = await knex(`${SCHEMA}.turma_disciplina`).select("id");

  if (alunos.length > 0 && turmas.length > 0) {
    // Insert Matriculas
    for (let i = 0; i < Math.min(alunos.length, turmas.length); i++) {
      try {
        await knex(`${SCHEMA}.matricula`).insert({
          id: `${i}aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
          aluno_id: alunos[i].id,
          curso_id: alunos[i].curso_id || turmas[0].curso_id,
          turma_id: turmas[i % turmas.length].id,
          status: "ativa",
        }).onConflict("id").ignore();
      } catch (e) {
        // ignore
      }
    }
  }

  // Insert Matrículas em Turma-Disciplina
  const matriculas = await knex(`${SCHEMA}.matricula`).select("id");
  if (matriculas.length > 0 && turmaDisciplinas.length > 0) {
    for (let i = 0; i < Math.min(matriculas.length, turmaDisciplinas.length); i++) {
      try {
        await knex(`${SCHEMA}.matricula_turma_disciplina`).insert({
          id: `${i}bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`,
          matricula_id: matriculas[i].id,
          turma_disciplina_id: turmaDisciplinas[i % turmaDisciplinas.length].id,
          status: "ativa",
        }).onConflict("id").ignore();
      } catch (e) {
        // ignore
      }
    }
  }

  console.log("✅ Tabelas finais populadas!");
}
