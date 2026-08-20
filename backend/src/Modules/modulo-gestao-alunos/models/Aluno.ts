import { CursoMapper, Curso } from "../../modulo-facul-dp-curso/models/Curso"
import { Pessoa, PessoaMapper } from "../../modulo-pessoa-usuario/models/Pessoa"
import { Usuario, UsuarioMapper } from "../../modulo-pessoa-usuario/models/Usuario"

export interface Aluno {
    id: string,
    matricula?: string,
    pessoa: Pessoa
    usuario?: Usuario
    periodo: number
    curso?: Curso
}

export interface AlunoCommand{
    id: string,
    matricula?: string,
    pessoa_id: string,
    usuario_id?: string,
    periodo: number,
    curso_id?: string
}

export class AlunoMapper {
    static toDomain(raw: any): Aluno {
        return {
            id: raw.id,
            matricula: raw.matricula,
            periodo: raw.periodo,

            pessoa: PessoaMapper.toDomain(raw),

            usuario: raw.u_id 
                ? UsuarioMapper.toDomain(raw) 
                : undefined,

            curso: raw.curso_id 
                ? CursoMapper.toDomain({
                    id: raw.curso_id,
                    codigo: raw.curso_codigo,
                    nome: raw.curso_nome
                }) 
                : undefined
        }
    }
}


