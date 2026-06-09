import { Knex } from "knex";

const SCHEMA = "piv";

export async function seed(knex: Knex): Promise<void> {
  // 1. Check and create pessoas if needed
  const pessoas = await knex(`${SCHEMA}.pessoa`).select("id").limit(10);
  console.log(`📝 Pessoas encontradas: ${pessoas.length}`);

  if (pessoas.length < 5) {
    // Create more pessoas (students)
    const CIDADE_IBGE = "3171303";
    const cpfs = [
      "111.111.111-11",
      "222.222.222-22", 
      "333.333.333-33",
      "444.444.444-44",
      "555.555.555-55"
    ];

    for (let i = 0; i < cpfs.length; i++) {
      await knex(`${SCHEMA}.pessoa`).insert({
        id: `dddddddd-dddd-dddd-dddd-${String(i).padStart(12, "0")}`,
        nome: `Aluno ${i + 1}`,
        data_nascimento: "2003-01-01",
        logradouro: `Rua ${i + 1}`,
        numero: String(100 + i),
        bairro: "Centro",
        cidade_id: CIDADE_IBGE,
        estado: "MG",
        cep: "36500-000",
        cpf: cpfs[i],
      }).onConflict("cpf").ignore();
      console.log(`✅ Pessoa ${i + 1} inserida`);
    }
  }

  // 2. Create alunos
  const pessoasAll = await knex(`${SCHEMA}.pessoa`).select("id").limit(10);
  console.log(`\n📝 Total pessoas agora: ${pessoasAll.length}`);

  for (let i = 0; i < Math.min(pessoasAll.length, 5); i++) {
    try {
      await knex(`${SCHEMA}.aluno`).insert({
        id: `aaaaaaaa-aaaa-aaaa-${String(i).padStart(4, "0")}-${String(i).padStart(12, "0")}`,
        pessoa_id: pessoasAll[i].id,
        matricula: `2024${String(i + 1).padStart(3, "0")}`,
        periodo: "1",
      }).onConflict("matricula").ignore();
      console.log(`✅ Aluno ${i + 1} criado`);
    } catch (e: any) {
      console.log(`⚠️ Erro aluno ${i + 1}: ${e.message?.substring(0, 30)}`);
    }
  }

  // 3. Create matrículas
  const alunos = await knex(`${SCHEMA}.aluno`).select("id").limit(10);
  const cursos = await knex(`${SCHEMA}.curso`).select("id").limit(5);
  const turmas = await knex(`${SCHEMA}.turma`).select("id").limit(5);

  console.log(`\n📝 Alunos agora: ${alunos.length}`);
  console.log(`📝 Cursos: ${cursos.length}`);
  console.log(`📝 Turmas: ${turmas.length}`);

  if (alunos.length > 0 && cursos.length > 0 && turmas.length > 0) {
    for (let i = 0; i < alunos.length; i++) {
      try {
        await knex(`${SCHEMA}.matricula`).insert({
          id: `bbbbbbbb-bbbb-bbbb-${String(i).padStart(4, "0")}-${String(i).padStart(12, "0")}`,
          aluno_id: alunos[i].id,
          curso_id: cursos[i % cursos.length].id,
          turma_id: turmas[i % turmas.length].id,
          status: "ativa",
        }).onConflict(["aluno_id", "turma_id"]).ignore();
        console.log(`✅ Matrícula ${i + 1} inserida`);
      } catch (e: any) {
        console.log(`⚠️ Erro matrícula ${i + 1}: ${e.message?.substring(0, 30)}`);
      }
    }
  }

  // 4. Link matriculas with turma_disciplinas
  const matriculas = await knex(`${SCHEMA}.matricula`).select("id");
  const turmaDisciplinas = await knex(`${SCHEMA}.turma_disciplina`).select("id");

  console.log(`\n📝 Matrículas agora: ${matriculas.length}`);
  console.log(`📝 Turma-Disciplinas: ${turmaDisciplinas.length}`);

  if (matriculas.length > 0 && turmaDisciplinas.length > 0) {
    let count = 0;
    for (let i = 0; i < matriculas.length; i++) {
      for (let j = 0; j < turmaDisciplinas.length; j++) {
        try {
          await knex(`${SCHEMA}.matricula_turma_disciplina`).insert({
            id: `cccccccc-cccc-cccc-${String(count).padStart(4, "0")}-${String(count).padStart(12, "0")}`,
            matricula_id: matriculas[i].id,
            turma_disciplina_id: turmaDisciplinas[j].id,
            status: "ativa",
          }).onConflict(["matricula_id", "turma_disciplina_id"]).ignore();
          count++;
          if (count % 5 === 0) console.log(`✅ ${count} vinculações inseridas`);
        } catch (e) {
          // ignore
        }
      }
    }
    console.log(`✅ Total de vinculações: ${count}`);
  }

  // Final verify
  const matCount = await knex(`${SCHEMA}.matricula`).count("* as total").first();
  const mtdCount = await knex(`${SCHEMA}.matricula_turma_disciplina`).count("* as total").first();
  
  console.log(`\n✅ FINAL - Matrículas: ${matCount?.total || 0}`);
  console.log(`✅ FINAL - Matricula-Turma-Disciplina: ${mtdCount?.total || 0}`);
}
