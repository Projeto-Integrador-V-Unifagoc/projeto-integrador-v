import { Pessoa } from "./Pessoa";
import { Usuario } from "./Usuario";

export interface Aluno {
    matricula: string
    pessoa: Pessoa
    usuario: Usuario
    periodo: number
}