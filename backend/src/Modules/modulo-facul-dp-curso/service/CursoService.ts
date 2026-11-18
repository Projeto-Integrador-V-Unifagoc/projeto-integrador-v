import { v4 as uuidv4 } from 'uuid';
import { CursoCommand } from "../models/Curso";
import { CursoRepository } from "../repository/CursoRepository";

export class CursoService {
    cursoRepository = new CursoRepository();
    private graus = ["BACHARELADO", "LICENCIATURA", "TECNOLOGO", "SEQUENCIAL", "POS_GRADUACAO"];
    private modalidades = ["PRESENCIAL", "HIBRIDO", "EAD"];
    private situacoes = ["ATIVO", "INATIVO", "EM_EXTINCAO"];

    private dadosAcademicos(data: any, parcial = false) {
        const resultado: Record<string, string | number | null> = {};
        const deveMapear = (campo: string) => !parcial || Object.prototype.hasOwnProperty.call(data, campo);

        if (deveMapear("descricao")) resultado.descricao = data.descricao?.trim() || null;

        if (deveMapear("grauAcademico")) {
            const grau = data.grauAcademico ? String(data.grauAcademico).toUpperCase() : null;
            if (grau && !this.graus.includes(grau)) throw Object.assign(new Error("Grau academico invalido"), { status: 400 });
            resultado.grau_academico = grau;
        }

        if (deveMapear("modalidade")) {
            const modalidade = data.modalidade ? String(data.modalidade).toUpperCase() : null;
            if (modalidade && !this.modalidades.includes(modalidade)) throw Object.assign(new Error("Modalidade invalida"), { status: 400 });
            resultado.modalidade = modalidade;
        }

        if (deveMapear("duracaoPeriodos")) {
            const duracao = data.duracaoPeriodos === "" || data.duracaoPeriodos === undefined ? null : Number(data.duracaoPeriodos);
            if (duracao !== null && (!Number.isInteger(duracao) || duracao < 1 || duracao > 30)) throw Object.assign(new Error("Duracao deve estar entre 1 e 30 periodos"), { status: 400 });
            resultado.duracao_periodos = duracao;
        }

        if (deveMapear("cargaHorariaMinima")) {
            const carga = data.cargaHorariaMinima === "" || data.cargaHorariaMinima === undefined ? null : Number(data.cargaHorariaMinima);
            if (carga !== null && (!Number.isInteger(carga) || carga <= 0)) throw Object.assign(new Error("Carga horaria minima deve ser positiva"), { status: 400 });
            resultado.carga_horaria_minima = carga;
        }

        if (deveMapear("situacaoAcademica")) {
            const situacao = String(data.situacaoAcademica ?? "ATIVO").toUpperCase();
            if (!this.situacoes.includes(situacao)) throw Object.assign(new Error("Situacao academica invalida"), { status: 400 });
            resultado.situacao_academica = situacao;
        }

        if (deveMapear("atoRegulatorio")) resultado.ato_regulatorio = data.atoRegulatorio?.trim() || null;
        if (deveMapear("observacoesRegulatorias")) resultado.observacoes_regulatorias = data.observacoesRegulatorias?.trim() || null;

        return resultado;
    }

    private traduzirErroRemocao(error: any) {
        const codigo = error?.code;
        const constraint = String(error?.constraint ?? "");
        const mensagemOriginal = String(error?.message ?? "");
        const detalhe = String(error?.detail ?? "");

        if (
            constraint.includes("turma_curso_id_foreign") ||
            mensagemOriginal.includes("turma_curso_id_foreign") ||
            detalhe.includes("turma_curso_id_foreign")
        ) {
            return "Nao e possivel remover o curso porque ele possui turmas cadastradas.";
        }

        if (
            codigo === "23503" ||
            mensagemOriginal.includes("violates RESTRICT setting of foreign key constraint") ||
            detalhe.includes("violates RESTRICT setting of foreign key constraint")
        ) {
            return "Nao e possivel remover o curso, pois ele possui registros vinculados.";
        }

        return null;
    }

    async criarCurso(data: any) {
        const curso: CursoCommand = {
            id: uuidv4(),
            codigo: data.codigo,
            nome: data.nome,
            departamento_id: data.departamentoId,
            ...this.dadosAcademicos(data)
        };

        return await this.cursoRepository.criarCurso(curso);
    }

    async listarCursos() {
        return await this.cursoRepository.listarCursos();
    }

    async buscarCursoPorId(id: string) {
        return await this.cursoRepository.buscarCursoPorId(id);
    }

    async atualizarCurso(id: string, data: any) {
        const curso: Partial<CursoCommand> = {
            codigo: data.codigo,
            nome: data.nome,
            departamento_id: data.departamentoId,
            ...this.dadosAcademicos(data, true)
        };

        return await this.cursoRepository.atualizarCurso(id, curso);
    }

    async removerCurso(id: string) {
        try {
            return await this.cursoRepository.removerCurso(id);
        } catch (error: any) {
            const mensagemTraduzida = this.traduzirErroRemocao(error);

            if (mensagemTraduzida) {
                throw new Error(mensagemTraduzida);
            }

            throw error;
        }
    }
}
