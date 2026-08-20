import type { Usuario } from "./usuario-model"
import type { Pessoa, PessoaV2 } from "./pessoa-model"
import type { CursoResponse } from "./curso-model"

export interface AlunoRequest {
  id: string
  matricula: number
  periodo: number
  pessoa: Pessoa
  usuario: Usuario
  curso: CursoResponse
}

export interface CriarAlunoRequest {
  periodo: number
  pessoa: {
    cpf: string
    nome: string
    dataNascimento: string
    logradouro: string
    numero: number
    bairro: string
    cidadeIbge: string
    estado: string
    cep: string
  }
}

export interface AlunoView {
  id: string
  matricula: number
  nome: string
  email?: string
  cpf: string
  logradouro: string
  bairro: string
  numero: string
  cidade: string
  estado: string
  cep: string
  periodo: number | string
  curso?: string
}

export interface AlunoResponse {
  id: string
  matricula: number
  periodo: string
  curso: string | CursoResponse
  pessoa: PessoaV2
}
