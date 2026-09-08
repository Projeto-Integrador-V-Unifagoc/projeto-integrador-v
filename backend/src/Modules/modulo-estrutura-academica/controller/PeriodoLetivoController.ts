import { PeriodoLetivoService } from "../service/PeriodoLetivoService";
import { responderErroEstruturaAcademica } from "../errors/EstruturaAcademicaError";

export class PeriodoLetivoController {
    periodoLetivoService = new PeriodoLetivoService();

    async criarPeriodoLetivo(req: any, res: any) {
        try {
            const periodoLetivo = await this.periodoLetivoService.criarPeriodoLetivo(req.body);
            res.status(201).json(periodoLetivo);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }

    async listarPeriodosLetivos(req: any, res: any) {
        try {
            const periodosLetivos = await this.periodoLetivoService.listarPeriodosLetivos();
            res.status(200).json(periodosLetivos);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }

    async buscarPeriodoLetivoPorId(req: any, res: any) {
        try {
            const periodoLetivo = await this.periodoLetivoService.buscarPeriodoLetivoPorId(req.params.id);

            if (!periodoLetivo) {
                return res.status(404).json({ error: "Periodo letivo nao encontrado" });
            }

            res.status(200).json(periodoLetivo);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }

    async atualizarPeriodoLetivo(req: any, res: any) {
        try {
            const periodoLetivo = await this.periodoLetivoService.atualizarPeriodoLetivo(req.params.id, req.body);

            if (!periodoLetivo) {
                return res.status(404).json({ error: "Periodo letivo nao encontrado" });
            }

            res.status(200).json(periodoLetivo);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }

    async removerPeriodoLetivo(req: any, res: any) {
        try {
            const removidos = await this.periodoLetivoService.removerPeriodoLetivo(req.params.id);

            if (!removidos) {
                return res.status(404).json({ error: "Periodo letivo nao encontrado" });
            }

            res.status(204).send();
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }
}
