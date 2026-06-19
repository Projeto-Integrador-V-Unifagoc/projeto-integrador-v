import { Knex } from "knex";

const SCHEMA = "piv";

const CIDADE_ID = "11111111-1111-1111-1111-111111111111";
const FACULDADE_ID = "22222222-2222-2222-2222-222222222222";

const DEPARTAMENTOS = [
  {
    id: "33333333-3333-3333-3333-333333333331",
    codigo: "DCC",
    nome: "Departamento de Ciencia da Computacao",
  },
  {
    id: "33333333-3333-3333-3333-333333333332",
    codigo: "DADM",
    nome: "Departamento de Administracao",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    codigo: "DDIR",
    nome: "Departamento de Direito",
  },
  {
    id: "33333333-3333-3333-3333-333333333334",
    codigo: "DENF",
    nome: "Departamento de Enfermagem",
  },
];

export async function seed(knex: Knex): Promise<void> {
  await knex(`${SCHEMA}.cidade`)
    .insert({
      id: CIDADE_ID,
      nome: "Uba",
      uf: "MG",
      ibge: "3171303",
    })
    .onConflict("ibge")
    .ignore();

  await knex(`${SCHEMA}.faculdade`)
    .insert({
      id: FACULDADE_ID,
      nome: "Centro Universitario Mock",
      cidade_id: "3171303",
      logradouro: "Avenida Academica",
      numero: "1000",
      bairro: "Centro",
      cep: "36500-000",
    })
    .onConflict("id")
    .ignore();

  await knex(`${SCHEMA}.departamento`)
    .insert(
      DEPARTAMENTOS.map((departamento) => ({
        ...departamento,
        faculdade_id: FACULDADE_ID,
      }))
    )
    .onConflict("codigo")
    .ignore();
}
