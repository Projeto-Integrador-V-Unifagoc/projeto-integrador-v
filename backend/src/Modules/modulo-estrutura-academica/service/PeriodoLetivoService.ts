import { v4 as uuidv4 } from "uuid";
import { PeriodoLetivoCommand } from "../models/PeriodoLetivo";
import { PeriodoLetivoRepository } from "../repository/PeriodoLetivoRepository";

export class PeriodoLetivoService {
    periodoLetivoRepository = new PeriodoLetivoRepository();

    private validarPeriodo(data: any) {
        const semestre = Number(data.semestre);

        if (![1, 2].includes(semestre)) {
            throw new Error("Semestre deve ser 1 ou 2");
        }

        if (new Date(data.dataFim) < new Date(data.dataInicio)) {
            throw new Error("Data fim deve ser maior ou igual a data inicio");
        }
    }

    async criarPeriodoLetivo(data: any) {
        this.validarPeriodo(data);

        const periodoPorCodigo = await this.periodoLetivoRepository.buscarPeriodoLetivoPorCodigo(data.codigo);

        if (periodoPorCodigo) {
            throw new Error("Ja existe periodo letivo com este codigo");
        }

        const periodoPorAnoSemestre = await this.periodoLetivoRepository.buscarPeriodoLetivoPorAnoSemestre(
            Number(data.ano),
            Number(data.semestre)
        );

        if (periodoPorAnoSemestre) {
            throw new Error("Ja existe periodo letivo para este ano e semestre");
        }

        const periodoLetivo: PeriodoLetivoCommand = {
            id: uuidv4(),
            codigo: data.codigo,
            ano: Number(data.ano),
            semestre: Number(data.semestre),
            data_inicio: data.dataInicio,
            data_fim: data.dataFim,
            ativo: data.ativo ?? true,
            status: data.status ?? "planejado"
        };

        return await this.periodoLetivoRepository.criarPeriodoLetivo(periodoLetivo);
    }

    async listarPeriodosLetivos() {
        return await this.periodoLetivoRepository.listarPeriodosLetivos();
    }

    async buscarPeriodoLetivoPorId(id: string) {
        return await this.periodoLetivoRepository.buscarPeriodoLetivoPorId(id);
    }

    async atualizarPeriodoLetivo(id: string, data: any) {
        const periodoAtual = await this.periodoLetivoRepository.buscarPeriodoLetivoPorId(id);

        if (!periodoAtual) {
            return null;
        }

        const payload = {
            codigo: data.codigo ?? periodoAtual.codigo,
            ano: data.ano ?? periodoAtual.ano,
            semestre: data.semestre ?? periodoAtual.semestre,
            dataInicio: data.dataInicio ?? periodoAtual.data_inicio,
            dataFim: data.dataFim ?? periodoAtual.data_fim,
            ativo: data.ativo ?? periodoAtual.ativo,
            status: data.status ?? periodoAtual.status
        };

        this.validarPeriodo(payload);

        if (payload.codigo !== periodoAtual.codigo) {
            const periodoPorCodigo = await this.periodoLetivoRepository.buscarPeriodoLetivoPorCodigo(payload.codigo);

            if (periodoPorCodigo) {
                throw new Error("Ja existe periodo letivo com este codigo");
            }
        }

        if (payload.ano !== periodoAtual.ano || payload.semestre !== periodoAtual.semestre) {
            const periodoPorAnoSemestre = await this.periodoLetivoRepository.buscarPeriodoLetivoPorAnoSemestre(
                Number(payload.ano),
                Number(payload.semestre)
            );

            if (periodoPorAnoSemestre) {
                throw new Error("Ja existe periodo letivo para este ano e semestre");
            }
        }

        return await this.periodoLetivoRepository.atualizarPeriodoLetivo(id, {
            codigo: payload.codigo,
            ano: Number(payload.ano),
            semestre: Number(payload.semestre),
            data_inicio: payload.dataInicio,
            data_fim: payload.dataFim,
            ativo: payload.ativo,
            status: payload.status
        });
    }

    async removerPeriodoLetivo(id: string) {
        return await this.periodoLetivoRepository.removerPeriodoLetivo(id);
    }
}
