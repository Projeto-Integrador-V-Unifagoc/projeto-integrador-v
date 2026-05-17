import { MatriculaService } from "../service/MatriculaService";

const service = new MatriculaService();

export class MatriculaController {

    async listarTurmasDisponiveis(req: any, res: any) {
        try {
            const turmas = await service.listarTurmasDisponiveis(req.params.cursoId);
            res.status(200).json(turmas);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }

    async criarMatricula(req: any, res: any) {
        try {
            const { alunoId, turmaId } = req.body;
            const mat = await service.criarMatricula(alunoId, turmaId);
            res.status(201).json(mat);
        } catch (err: any) {
            const status = err.message.includes("já está matriculado") ? 409
                : err.message.includes("obrigatório") ? 400 : 500;
            res.status(status).json({ error: err.message });
        }
    }

    async listarTodas(_req: any, res: any) {
        try {
            res.status(200).json(await service.listarTodas());
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    async listarPorAluno(req: any, res: any) {
        try {
            res.status(200).json(await service.listarPorAluno(req.params.alunoId));
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    async cancelar(req: any, res: any) {
        try {
            res.status(200).json(await service.cancelar(req.params.id));
        } catch (err: any) {
            const status = err.message.includes("não encontrada") ? 404
                : err.message.includes("já está cancelada") ? 409 : 500;
            res.status(status).json({ error: err.message });
        }
    }

    async atualizarStatus(req: any, res: any) {
        try {
            const { status } = req.body;
            if (!status) return res.status(400).json({ error: 'Campo "status" é obrigatório.' });
            res.status(200).json(await service.atualizarStatus(req.params.id, status));
        } catch (err: any) {
            const status = err.message.includes("não encontrada") ? 404
                : err.message.includes("inválido") ? 400 : 500;
            res.status(status).json({ error: err.message });
        }
    }
}
