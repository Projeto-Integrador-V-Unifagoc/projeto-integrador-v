import type { Usuario } from "./usuario-model"
import type { Pessoa } from "./pessoa-model"

export interface AlunoRequest {
  id: string
  matricula: number
  periodo: number
  pessoa: Pessoa
  usuario: Usuario
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
}