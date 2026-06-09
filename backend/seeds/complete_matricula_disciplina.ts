import { Knex } from "knex";

const SCHEMA = "piv";

export async function seed(knex: Knex): Promise<void> {
  // Get existing data
  const alunos = await knex(`${SCHEMA}.aluno`).select("id", "pessoa_id").limit(10);
  const cursos = await knex(`${SCHEMA}.curso`).select("id").limit(5);
  const turmas = await knex(`${SCHEMA}.turma`).select("id").limit(5);
  const periodos = await knex(`${SCHEMA}.periodo_letivo`).select("id").limit(5);

  console.log(`📝 Alunos encontrados: ${alunos.length}`);
  console.log(`📝 Cursos encontrados: ${cursos.length}`);
  console.log(`📝 Turmas encontradas: ${turmas.length}`);
  console.log(`📝 Períodos encontrados: ${periodos.length}`);

  if (alunos.length > 0 && cursos.length > 0 && turmas.length > 0) {
    // Create Matriculas
    for (let i = 0; i < alunos.length; i++) {
      const cursoId = cursos[i % cursos.length].id;
      const turmaId = turmas[i % turmas.length].id;

      try {
        await knex(`${SCHEMA}.matricula`).insert({
          id: `ffffffff-ffff-ffff-${String(i).padStart(4, "0")}-${String(i).padStart(12, "0")}`,
          aluno_id: alunos[i].id,
          curso_id: cursoId,
          turma_id: turmaId,
          status: "ativa",
          data_matricula: new Date(),
        }).onConflict("id").ignore();

        console.log(`✅ Matrícula ${i + 1} para aluno ${i + 1} inserida`);
      } catch (e: any) {
        console.log(`⚠️ Erro matrícula ${i + 1}: ${e.message?.substring(0, 50)}`);
      }
    }
  }

  // Now create matricula_turma_disciplina links
  const matriculas = await knex(`${SCHEMA}.matricula`).select("id");
  const turmaDisciplinas = await knex(`${SCHEMA}.turma_disciplina`).select("id");

  console.log(`\n📝 Matrículas criadas/encontradas: ${matriculas.length}`);
  console.log(`📝 Turma-Disciplinas encontradas: ${turmaDisciplinas.length}`);

  if (matriculas.length > 0 && turmaDisciplinas.length > 0) {
    for (let i = 0; i < Math.min(matriculas.length * turmaDisciplinas.length, 50); i++) {
      const matriculaId = matriculas[i % matriculas.length].id;
      const turmaDisciplinaId = turmaDisciplinas[i % turmaDisciplinas.length].id;

      try {
        await knex(`${SCHEMA}.matricula_turma_disciplina`).insert({
          id: `eeeeeeee-eeee-eeee-${String(i).padStart(4, "0")}-${String(i).padStart(12, "0")}`,
          matricula_id: matriculaId,
          turma_disciplina_id: turmaDisciplinaId,
          status: "ativa",
        }).onConflict("id").ignore();

        console.log(`✅ Vinculação ${i + 1} inserida`);
      } catch (e: any) {
        console.log(`⚠️ Erro vinculação ${i + 1}: ${e.message?.substring(0, 50)}`);
      }
    }
  }

  // Final counts
  const mtdCount = await knex(`${SCHEMA}.matricula_turma_disciplina`).count("* as total").first();
  const matCount = await knex(`${SCHEMA}.matricula`).count("* as total").first();
  
  console.log(`\n✅ Total de matrículas: ${matCount?.total || 0}`);
  console.log(`✅ Total de matricula_turma_disciplina: ${mtdCount?.total || 0}`);
}
