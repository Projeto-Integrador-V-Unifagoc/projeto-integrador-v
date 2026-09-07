import { Knex } from "knex";
import bcrypt from "bcrypt";

const SCHEMA = "piv";
const FACULDADE_ID = "22222222-2222-2222-2222-222222222222";
const CIDADE_IBGE = "3171303";

const CURSOS = [
  {
    id: "88888888-8888-8888-8888-888888888881",
    codigo: "ES-MOCK",
    nome: "Engenharia de Software Mock",
    departamento_id: "33333333-3333-3333-3333-333333333331",
  },
  {
    id: "88888888-8888-8888-8888-888888888882",
    codigo: "ADS-MOCK",
    nome: "Analise e Desenvolvimento de Sistemas Mock",
    departamento_id: "33333333-3333-3333-3333-333333333331",
  },
];

const USUARIOS = [
  {
    id: "99999999-9999-9999-9999-999999999991",
    nome: "Marina Rocha",
    email: "marina.turma.mock@unieduca.local",
    tipo_usuario: "professor",
  },
  {
    id: "99999999-9999-9999-9999-999999999992",
    nome: "Carlos Mendes",
    email: "carlos.turma.mock@unieduca.local",
    tipo_usuario: "professor",
  },
  {
    id: "99999999-9999-9999-9999-999999999993",
    nome: "Ana Beatriz Lima",
    email: "ana.turma.mock@unieduca.local",
    tipo_usuario: "professor",
  },
];

const PESSOAS = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    nome: "Marina Rocha",
    data_nascimento: "1985-04-12",
    logradouro: "Rua dos Professores",
    numero: "10",
    bairro: "Centro",
    cidade_id: CIDADE_IBGE,
    estado: "MG",
    cep: "36500-000",
    cpf: "444.444.444-41",
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    nome: "Carlos Mendes",
    data_nascimento: "1981-09-22",
    logradouro: "Rua dos Professores",
    numero: "20",
    bairro: "Centro",
    cidade_id: CIDADE_IBGE,
    estado: "MG",
    cep: "36500-000",
    cpf: "555.555.555-52",
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
    nome: "Ana Beatriz Lima",
    data_nascimento: "1988-01-30",
    logradouro: "Rua dos Professores",
    numero: "30",
    bairro: "Centro",
    cidade_id: CIDADE_IBGE,
    estado: "MG",
    cep: "36500-000",
    cpf: "666.666.666-63",
  },
];

const PROFESSORES = [
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    usuario_id: "99999999-9999-9999-9999-999999999991",
    pessoa_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    curso_id: "88888888-8888-8888-8888-888888888881",
    faculdade_id: FACULDADE_ID,
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
    usuario_id: "99999999-9999-9999-9999-999999999992",
    pessoa_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    curso_id: "88888888-8888-8888-8888-888888888881",
    faculdade_id: FACULDADE_ID,
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3",
    usuario_id: "99999999-9999-9999-9999-999999999993",
    pessoa_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
    curso_id: "88888888-8888-8888-8888-888888888882",
    faculdade_id: FACULDADE_ID,
  },
];

export async function seed(knex: Knex): Promise<void> {
  const senhaHash = await bcrypt.hash("Professor@123", 10);

  await knex(`${SCHEMA}.curso`)
    .insert(CURSOS)
    .onConflict("codigo")
    .ignore();

  await knex(`${SCHEMA}.usuario`)
    .insert(
      USUARIOS.map((usuario) => ({
        ...usuario,
        senha: senhaHash,
      }))
    )
    .onConflict("email")
    .ignore();

  await knex(`${SCHEMA}.pessoa`)
    .insert(PESSOAS)
    .onConflict("cpf")
    .ignore();

  await knex(`${SCHEMA}.professor`)
    .insert(PROFESSORES)
    .onConflict("id")
    .ignore();
}
