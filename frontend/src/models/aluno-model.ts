import type { Usuario } from "./usuario-model"
import type { Pessoa } from "./pessoa-model"

export interface AlunoRequest {
  matricula: string
  periodo: number
  pessoa: Pessoa
  usuario: Usuario
}