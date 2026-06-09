import { Knex } from "knex";

const SCHEMA = "piv";

export async function seed(knex: Knex): Promise<void> {
  console.log("🎓 Iniciando população de alunos, matrículas e vinculações...\n");

  // 1. Get pessoas
  const pessoas = await knex(`${SCHEMA}.pessoa`).select("id").limit(10);
  const cursos = await knex(`${SCHEMA}.curso`).select("id").limit(5);
  const turmas = await knex(`${SCHEMA}.turma`).select("id").limit(5);
  const turmaDisciplinas = await knex(`${SCHEMA}.turma_disciplina`).select("id").limit(10);

  console.log(`📝 Pessoas disponíveis: ${pessoas.length}`);
  console.log(`📝 Cursos: ${cursos.length}`);
  console.log(`📝 Turmas: ${turmas.length}`);
  console.log(`📝 Turma-Disciplinas: ${turmaDisciplinas.length}\n`);

  // 2. Create alunos (sem inserir matricula pois é auto_increment)
  let alunosCreated = 0;
  for (let i = 0; i < Math.min(pessoas.length, 5); i++) {
    try {
      await knex(`${SCHEMA}.aluno`).insert({
        pessoa_id: pessoas[i].id,
        curso_id: cursos[i % cursos.length].id,
        periodo: "1",
      });
      alunosCreated++;
      console.log(`✅ Aluno ${alunosCreated} criado`);
    } catch (e: any) {
      console.log(`⚠️ Erro ao criar aluno: ${e.message?.substring(0, 50)}`);
    }
  }

  // 3. Get created alunos
  const alunos = await knex(`${SCHEMA}.aluno`).select("id").limit(10);
  console.log(`\n📝 Total de alunos agora: ${alunos.length}\n`);

  // 4. Create matrículas
  let matriculasCreated = 0;
  if (alunos.length > 0 && turmas.length > 0) {
    for (let i = 0; i < alunos.length; i++) {
      try {
        await knex(`${SCHEMA}.matricula`).insert({
          aluno_id: alunos[i].id,
          curso_id: cursos[i % cursos.length].id,
          turma_id: turmas[i % turmas.length].id,
          status: "ativa",
        });
        matriculasCreated++;
        console.log(`✅ Matrícula ${matriculasCreated} criada`);
      } catch (e: any) {
        console.log(`⚠️ Erro matrícula: ${e.message?.substring(0, 50)}`);
      }
    }
  }

  // 5. Link matriculas with turma_disciplinas
  const matriculas = await knex(`${SCHEMA}.matricula`).select("id").limit(10);
  console.log(`\n📝 Total de matrículas agora: ${matriculas.length}\n`);

  let linksCreated = 0;
  if (matriculas.length > 0 && turmaDisciplinas.length > 0) {
    for (let i = 0; i < matriculas.length; i++) {
      for (let j = 0; j < turmaDisciplinas.length; j++) {
        try {
          await knex(`${SCHEMA}.matricula_turma_disciplina`).insert({
            matricula_id: matriculas[i].id,
            turma_disciplina_id: turmaDisciplinas[j].id,
            status: "ativa",
          });
          linksCreated++;
          if (linksCreated % 5 === 0) console.log(`✅ ${linksCreated} vinculações criadas`);
        } catch (e: any) {
          // Ignore duplicates
          if (e.message?.includes("duplicate") === false) {
            console.log(`⚠️ Erro vínculo: ${e.message?.substring(0, 30)}`);
          }
        }
      }
    }
  }

  // Final counts
  const alunoCount = await knex(`${SCHEMA}.aluno`).count("* as total").first();
  const matCount = await knex(`${SCHEMA}.matricula`).count("* as total").first();
  const mtdCount = await knex(`${SCHEMA}.matricula_turma_disciplina`).count("* as total").first();

  console.log(`\n✅ POPULAÇÃO COMPLETA:`);
  console.log(`   Alunos: ${alunoCount?.total || 0}`);
  console.log(`   Matrículas: ${matCount?.total || 0}`);
  console.log(`   Matricula-Turma-Disciplina: ${mtdCount?.total || 0}`);
}
