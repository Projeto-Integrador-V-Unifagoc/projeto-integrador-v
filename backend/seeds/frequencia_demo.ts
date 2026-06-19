import type { Knex } from "knex";

const SCHEMA = "piv";

const ids = {
  cidadeIbge: "3113404",
  usuarioProfessor: "00000000-0000-0000-0000-000000000001",
  usuarioAluno1: "00000000-0000-0000-0000-000000000002",
  usuarioAluno2: "00000000-0000-0000-0000-000000000003",
  usuarioAluno3: "00000000-0000-0000-0000-000000000004",
  pessoaProfessor: "00000000-0000-0000-0000-000000000011",
  pessoaAluno1: "00000000-0000-0000-0000-000000000012",
  pessoaAluno2: "00000000-0000-0000-0000-000000000013",
  pessoaAluno3: "00000000-0000-0000-0000-000000000014",
  faculdade: "00000000-0000-0000-0000-000000000021",
  departamento: "00000000-0000-0000-0000-000000000031",
  curso: "00000000-0000-0000-0000-000000000041",
  disciplina: "00000000-0000-0000-0000-000000000051",
  cursoDisciplina: "00000000-0000-0000-0000-000000000052",
  professor: "00000000-0000-0000-0000-000000000101",
  periodoLetivo: "00000000-0000-0000-0000-000000000060",
  turma: "00000000-0000-0000-0000-000000000061",
  turmaDisciplina: "00000000-0000-0000-0000-000000000062",
  local: "00000000-0000-0000-0000-000000000071",
  aula: "00000000-0000-0000-0000-000000000072",
  aluno1: "00000000-0000-0000-0000-000000000201",
  aluno2: "00000000-0000-0000-0000-000000000202",
  aluno3: "00000000-0000-0000-0000-000000000203",
  matricula1: "00000000-0000-0000-0000-000000000301",
  matricula2: "00000000-0000-0000-0000-000000000302",
  matricula3: "00000000-0000-0000-0000-000000000303",
  matriculaTurmaDisciplina1: "00000000-0000-0000-0000-000000000311",
  matriculaTurmaDisciplina2: "00000000-0000-0000-0000-000000000312",
  matriculaTurmaDisciplina3: "00000000-0000-0000-0000-000000000313",
};

export async function seed(knex: Knex): Promise<void> {
  await knex(`${SCHEMA}.cidade`)
    .insert({
      id: "00000000-0000-0000-0000-000000000401",
      nome: "Caratinga",
      uf: "MG",
      ibge: ids.cidadeIbge,
    })
    .onConflict("ibge")
    .ignore();

  /*await knex(`${SCHEMA}.usuario`)
    .insert([
      { id: ids.usuarioProfessor, email: "professor.frequencia@unifagoc.edu.br", senha: "mock", tipo_usuario: "PROFESSOR" },
      { id: ids.usuarioAluno1, email: "ana.frequencia@aluno.edu.br", senha: "mock", tipo_usuario: "ALUNO" },
      { id: ids.usuarioAluno2, email: "bruno.frequencia@aluno.edu.br", senha: "mock", tipo_usuario: "ALUNO" },
      { id: ids.usuarioAluno3, email: "carla.frequencia@aluno.edu.br", senha: "mock", tipo_usuario: "ALUNO" },
    ])
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.pessoa`)
    .insert([
      { id: ids.pessoaProfessor, nome: "Professor Demo Frequencia", data_nascimento: "1985-02-10", logradouro: "Rua Demo", numero: "10", bairro: "Centro", cidade_id: ids.cidadeIbge, estado: "MG", cep: "35300000", cpf: "000.000.000-10" },
      { id: ids.pessoaAluno1, nome: "Ana Paula Frequencia", data_nascimento: "2001-03-12", logradouro: "Rua A", numero: "101", bairro: "Centro", cidade_id: ids.cidadeIbge, estado: "MG", cep: "35300000", cpf: "000.000.000-11" },
      { id: ids.pessoaAluno2, nome: "Bruno Lima Frequencia", data_nascimento: "2000-04-22", logradouro: "Rua B", numero: "202", bairro: "Centro", cidade_id: ids.cidadeIbge, estado: "MG", cep: "35300000", cpf: "000.000.000-12" },
      { id: ids.pessoaAluno3, nome: "Carla Souza Frequencia", data_nascimento: "2002-08-05", logradouro: "Rua C", numero: "303", bairro: "Centro", cidade_id: ids.cidadeIbge, estado: "MG", cep: "35300000", cpf: "000.000.000-13" },
    ])
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.faculdade`)
    .insert({
      id: ids.faculdade,
      nome: "Faculdade Demo Frequencia",
      cidade_id: ids.cidadeIbge,
      logradouro: "Avenida Universitaria",
      numero: "100",
      bairro: "Universitario",
      cep: "35300000",
    })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.departamento`)
    .insert({
      id: ids.departamento,
      codigo: "DEP-FREQ",
      nome: "Departamento Demo Frequencia",
      faculdade_id: ids.faculdade,
    })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.curso`)
    .insert({
      id: ids.curso,
      codigo: "ADS-FREQ",
      nome: "Analise e Desenvolvimento de Sistemas",
      departamento_id: ids.departamento,
    })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.disciplinas`)
    .insert({
      id: ids.disciplina,
      codigo: "PI5-FREQ",
      nome: "Projeto Integrador V",
      carga_horaria: 80,
      ativo: true,
    })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.curso_disciplina`)
    .insert({
      id: ids.cursoDisciplina,
      curso_id: ids.curso,
      disciplina_id: ids.disciplina,
      periodo_ideal: 5,
      obrigatoria: true,
      carga_horaria: 80,
      ativo: true,
    })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.professor`)
    .insert({
      id: ids.professor,
      usuario_id: ids.usuarioProfessor,
      pessoa_id: ids.pessoaProfessor,
      curso_id: ids.curso,
      faculdade_id: ids.faculdade,
    })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.periodo_letivo`)
    .insert({
      id: ids.periodoLetivo,
      codigo: "2026.1-FREQ",
      ano: 2026,
      semestre: 1,
      data_inicio: "2026-02-02",
      data_fim: "2026-06-30",
      ativo: true,
      status: "ativo",
    })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.local`)
    .insert({ id: ids.local, codigo: "SALA-FREQ-DEMO" })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.turma`)
    .insert({
      id: ids.turma,
      periodo_letivo_id: ids.periodoLetivo,
      curso_id: ids.curso,
      periodo_curricular: 5,
      descricao: "Turma Demo Frequencia 2026.1",
      sigla: "ADS5A-FREQ",
      capacidade_alunos: 50,
      turno: "Noturno",
      status: "ativa",
    })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.turma_disciplina`)
    .insert({
      id: ids.turmaDisciplina,
      turma_id: ids.turma,
      curso_disciplina_id: ids.cursoDisciplina,
      professor_id: ids.professor,
      status: "ativa",
    })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.aluno`)
    .insert([
      { id: ids.aluno1, usuario_id: ids.usuarioAluno1, pessoa_id: ids.pessoaAluno1, curso_id: ids.curso, periodo: "5" },
      { id: ids.aluno2, usuario_id: ids.usuarioAluno2, pessoa_id: ids.pessoaAluno2, curso_id: ids.curso, periodo: "5" },
      { id: ids.aluno3, usuario_id: ids.usuarioAluno3, pessoa_id: ids.pessoaAluno3, curso_id: ids.curso, periodo: "5" },
    ])
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.matricula`)
    .insert([
      { id: ids.matricula1, aluno_id: ids.aluno1, curso_id: ids.curso, turma_id: ids.turma, status: "ativa", data_matricula: "2026-02-03" },
      { id: ids.matricula2, aluno_id: ids.aluno2, curso_id: ids.curso, turma_id: ids.turma, status: "ativa", data_matricula: "2026-02-03" },
      { id: ids.matricula3, aluno_id: ids.aluno3, curso_id: ids.curso, turma_id: ids.turma, status: "ativa", data_matricula: "2026-02-03" },
    ])
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.matricula_turma_disciplina`)
    .insert([
      { id: ids.matriculaTurmaDisciplina1, turma_disciplina_id: ids.turmaDisciplina, matricula_id: ids.matricula1, status: "ativa", data_vinculo: "2026-02-03" },
      { id: ids.matriculaTurmaDisciplina2, turma_disciplina_id: ids.turmaDisciplina, matricula_id: ids.matricula2, status: "ativa", data_vinculo: "2026-02-03" },
      { id: ids.matriculaTurmaDisciplina3, turma_disciplina_id: ids.turmaDisciplina, matricula_id: ids.matricula3, status: "ativa", data_vinculo: "2026-02-03" },
    ])
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.aula`)
    .insert({
      id: ids.aula,
      data: "2026-02-10T19:00:00.000Z",
      local_id: ids.local,
      professor_id: ids.professor,
      turma_disciplina_id: ids.turmaDisciplina,
    })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.frequencia`)
    .insert([
      { aula_id: ids.aula, matricula_turma_disciplina_id: ids.matriculaTurmaDisciplina1, status: "PRESENTE", data: "2026-02-10" },
      { aula_id: ids.aula, matricula_turma_disciplina_id: ids.matriculaTurmaDisciplina2, status: "PRESENTE", data: "2026-02-10" },
      { aula_id: ids.aula, matricula_turma_disciplina_id: ids.matriculaTurmaDisciplina3, status: "AUSENTE", data: "2026-02-10" },
    ])
    .onConflict(["aula_id", "matricula_turma_disciplina_id"])
    .ignore();*/
}
