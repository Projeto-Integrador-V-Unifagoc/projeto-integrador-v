import { Request, Response } from "express";
import { PeriodoLetivoService } from "../service/PeriodoLetivoService";

export class PeriodoLetivoController {
    periodoLetivoService = new PeriodoLetivoService();

    async criarPeriodoLetivo(req: Request, res: Response) {
        try {
            const periodoLetivo = await this.periodoLetivoService.criarPeriodoLetivo(req.body);
            res.status(201).json(periodoLetivo);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async listarPeriodosLetivos(req: Request, res: Response) {
        try {
            const periodosLetivos = await this.periodoLetivoService.listarPeriodosLetivos();
            res.status(200).json(periodosLetivos);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async buscarPeriodoLetivoPorId(req: Request, res: Response) {
        try {
            const periodoLetivo = await this.periodoLetivoService.buscarPeriodoLetivoPorId(String(req.params.id));

            if (!periodoLetivo) {
                return res.status(404).json({ error: "Periodo letivo nao encontrado" });
            }

            res.status(200).json(periodoLetivo);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async atualizarPeriodoLetivo(req: Request, res: Response) {
        try {
            const periodoLetivo = await this.periodoLetivoService.atualizarPeriodoLetivo(String(req.params.id), req.body);

            if (!periodoLetivo) {
                return res.status(404).json({ error: "Periodo letivo nao encontrado" });
            }

            res.status(200).json(periodoLetivo);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async removerPeriodoLetivo(req: Request, res: Response) {
        try {
            const removidos = await this.periodoLetivoService.removerPeriodoLetivo(String(req.params.id));

            if (!removidos) {
                return res.status(404).json({ error: "Periodo letivo nao encontrado" });
            }

            res.status(204).send();
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }
}
