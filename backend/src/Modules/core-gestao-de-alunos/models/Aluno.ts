import { Pessoa } from "./Pessoa";
import { Usuario } from "./Usuario";

export interface Aluno {
    aluno: {
        matricula: string
        usuario_id: string
        pessoa_id: string
        periodo: string
    }
    pessoa: Pessoa
    usuario: Usuario
}