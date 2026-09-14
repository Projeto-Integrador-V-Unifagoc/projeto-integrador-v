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

interface RawAluno {
    id?: string;
    matricula?: string;
    periodo?: number;
    u_id?: string;
    curso_id?: string;
    curso_codigo?: string;
    curso_nome?: string;
}

export class AlunoMapper {
    static toDomain(raw: RawAluno): Aluno {
        return {
            id: raw.id as string,
            matricula: raw.matricula,
            periodo: raw.periodo as number,

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


