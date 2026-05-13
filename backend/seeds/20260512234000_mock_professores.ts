import { Knex } from "knex";

const SCHEMA = "piv";
const FACULDADE_ID = "22222222-2222-2222-2222-222222222222";
const CIDADE_IBGE = "3171303";

const CURSOS = [
  {
    id: "44444444-4444-4444-4444-444444444441",
    codigo: "BCC-MOCK",
    nome: "Bacharelado em Ciencia da Computacao",
    departamento_id: "33333333-3333-3333-3333-333333333331",
  },
  {
    id: "44444444-4444-4444-4444-444444444442",
    codigo: "ADM-MOCK",
    nome: "Bacharelado em Administracao",
    departamento_id: "33333333-3333-3333-3333-333333333332",
  },
];

const USUARIOS = [
  {
    id: "55555555-5555-5555-5555-555555555551",
    email: "marina.mock@unieduca.local",
    senha: "123456",
    tipo_usuario: "professor",
  },
  {
    id: "55555555-5555-5555-5555-555555555552",
    email: "carlos.mock@unieduca.local",
    senha: "123456",
    tipo_usuario: "professor",
  },
  {
    id: "55555555-5555-5555-5555-555555555553",
    email: "ana.mock@unieduca.local",
    senha: "123456",
    tipo_usuario: "professor",
  },
];

const PESSOAS = [
  {
    id: "66666666-6666-6666-6666-666666666661",
    nome: "Marina Rocha",
    data_nascimento: "1985-04-12",
    logradouro: "Rua dos Professores",
    numero: "10",
    bairro: "Centro",
    cidade_id: CIDADE_IBGE,
    estado: "MG",
    cep: "36500-000",
    cpf: "111.111.111-11",
  },
  {
    id: "66666666-6666-6666-6666-666666666662",
    nome: "Carlos Mendes",
    data_nascimento: "1981-09-22",
    logradouro: "Rua dos Professores",
    numero: "20",
    bairro: "Centro",
    cidade_id: CIDADE_IBGE,
    estado: "MG",
    cep: "36500-000",
    cpf: "222.222.222-22",
  },
  {
    id: "66666666-6666-6666-6666-666666666663",
    nome: "Ana Beatriz Lima",
    data_nascimento: "1988-01-30",
    logradouro: "Rua dos Professores",
    numero: "30",
    bairro: "Centro",
    cidade_id: CIDADE_IBGE,
    estado: "MG",
    cep: "36500-000",
    cpf: "333.333.333-33",
  },
];

const PROFESSORES = [
  {
    id: "77777777-7777-7777-7777-777777777771",
    usuario_id: "55555555-5555-5555-5555-555555555551",
    pessoa_id: "66666666-6666-6666-6666-666666666661",
    curso_id: "44444444-4444-4444-4444-444444444441",
    faculdade_id: FACULDADE_ID,
  },
  {
    id: "77777777-7777-7777-7777-777777777772",
    usuario_id: "55555555-5555-5555-5555-555555555552",
    pessoa_id: "66666666-6666-6666-6666-666666666662",
    curso_id: "44444444-4444-4444-4444-444444444441",
    faculdade_id: FACULDADE_ID,
  },
  {
    id: "77777777-7777-7777-7777-777777777773",
    usuario_id: "55555555-5555-5555-5555-555555555553",
    pessoa_id: "66666666-6666-6666-6666-666666666663",
    curso_id: "44444444-4444-4444-4444-444444444442",
    faculdade_id: FACULDADE_ID,
  },
];

export async function seed(knex: Knex): Promise<void> {
  await knex(`${SCHEMA}.curso`)
    .insert(CURSOS)
    .onConflict("codigo")
    .ignore();

  await knex(`${SCHEMA}.usuario`)
    .insert(USUARIOS)
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
