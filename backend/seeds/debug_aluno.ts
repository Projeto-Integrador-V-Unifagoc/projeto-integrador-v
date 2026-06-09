import { Knex } from "knex";

const SCHEMA = "piv";

export async function seed(knex: Knex): Promise<void> {
  console.log("🔍 Analisando estrutura do banco...\n");

  // Get table schema
  const schema = await knex.raw(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = '${SCHEMA}' AND table_name = 'aluno'
    ORDER BY ordinal_position
  `);

  console.log("📋 Estrutura da tabela ALUNO:");
  schema.rows.forEach((col: any) => {
    console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(obrigatório)' : '(opcional)'}`);
  });

  // Try to get existing alunos
  const alunosCount = await knex(`${SCHEMA}.aluno`).count("* as total").first();
  console.log(`\n📝 Alunos existentes: ${alunosCount?.total || 0}`);

  // Get sample data
  const pessoas = await knex(`${SCHEMA}.pessoa`).select("id").limit(1);
  const cursos = await knex(`${SCHEMA}.curso`).select("id").limit(1);

  if (pessoas.length > 0) {
    console.log(`\n📝 Pessoas disponíveis: ${pessoas.length}`);
    console.log(`📝 Cursos disponíveis: ${cursos.length}`);

    // Try to insert with full schema info
    try {
      const result = await knex(`${SCHEMA}.aluno`).insert({
        pessoa_id: pessoas[0].id,
        curso_id: cursos.length > 0 ? cursos[0].id : null,
        periodo: "1",
        matricula: "SEED2024001",
      }).onConflict("matricula").ignore();

      console.log(`✅ Aluno inserido com sucesso!`);
    } catch (e: any) {
      console.log(`❌ Erro ao inserir aluno:`);
      console.log(e.message);
    }
  }

  // Count matriculas and links
  const matriculaCount = await knex(`${SCHEMA}.matricula`).count("* as total").first();
  const mtdCount = await knex(`${SCHEMA}.matricula_turma_disciplina`).count("* as total").first();
  const alunoFinal = await knex(`${SCHEMA}.aluno`).count("* as total").first();

  console.log(`\n📊 RESUMO FINAL:`);
  console.log(`   Alunos: ${alunoFinal?.total || 0}`);
  console.log(`   Matrículas: ${matriculaCount?.total || 0}`);
  console.log(`   Matricula-Turma-Disciplina: ${mtdCount?.total || 0}`);
}
