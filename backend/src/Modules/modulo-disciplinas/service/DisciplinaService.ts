import { ValidacaoEstrutura } from "../../modulo-estrutura-academica/gateways/EscritaEstruturaAcademica";
import { v4 as uuidv4 } from "uuid";
import { DisciplinaCommand } from "../models/Disciplina";
import { DisciplinaRepository } from "../repository/DisciplinaRepository";

export class DisciplinaService {
    disciplinaRepository = new DisciplinaRepository();

    async criarDisciplina(data: any) {
        if (!data || typeof data !== "object" || Array.isArray(data)
            || typeof data.codigo !== "string" || !data.codigo.trim()
            || typeof data.nome !== "string" || !data.nome.trim()
            || data.cargaHoraria == null || !Number.isFinite(Number(data.cargaHoraria))) {
            throw new ValidacaoEstrutura("Informe código, nome e carga horária válidos.");
        }
        const disciplinaExistente = await this.disciplinaRepository.buscarDisciplinaPorCodigo(data.codigo);

        if (disciplinaExistente) {
            throw new ValidacaoEstrutura("Ja existe disciplina com este codigo");
        }

        const disciplina: DisciplinaCommand = {
            id: uuidv4(),
            codigo: data.codigo,
            nome: data.nome,
            pre_requisito: data.preRequisito,
            carga_horaria: Number(data.cargaHoraria),
            ativo: data.ativo ?? true
        };

        return await this.disciplinaRepository.criarDisciplina(disciplina);
    }

    async listarDisciplinas() {
        return await this.disciplinaRepository.listarDisciplinas();
    }

    async buscarDisciplinaPorId(id: string) {
        return await this.disciplinaRepository.buscarDisciplinaPorId(id);
    }

    async atualizarDisciplina(id: string, data: any) {
        const disciplinaAtual = await this.disciplinaRepository.buscarDisciplinaPorId(id);

        if (!disciplinaAtual) {
            return null;
        }

        if (data.codigo && data.codigo !== disciplinaAtual.codigo) {
            const disciplinaExistente = await this.disciplinaRepository.buscarDisciplinaPorCodigo(data.codigo);

            if (disciplinaExistente) {
                throw new ValidacaoEstrutura("Ja existe disciplina com este codigo");
            }
        }

        const disciplina: Partial<DisciplinaCommand> = {
            codigo: data.codigo,
            nome: data.nome,
            pre_requisito: data.preRequisito,
            carga_horaria: data.cargaHoraria !== undefined ? Number(data.cargaHoraria) : undefined,
            ativo: data.ativo
        };

        return await this.disciplinaRepository.atualizarDisciplina(id, disciplina);
    }

    async removerDisciplina(id: string) {
        return await this.disciplinaRepository.removerDisciplina(id);
    }
}
