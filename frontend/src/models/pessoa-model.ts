import type { CidadeModel } from "./cidade-model"

export interface Pessoa {
  id: string
  cpf: string | number
  nome: string
  dataNascimento: string
  logradouro: string
  numero: string
  bairro: string
  estado: string
  cep: string
  cidade: CidadeModel
  cidadeIbge: number
}

export interface PessoaV2 {
    id: string
    cpf: string
    nome: string
    dataNascimento: string
    logradouro: string
    numero: string
    bairro: string
    estado: string
    cep: string
    cidade: CidadeModel
}