import { MatriculaError, MatriculaService } from "../service/MatriculaService";

const service = new MatriculaService();

export class MatriculaController {

    async listarTurmasDisponiveis(req: any, res: any) {
        try {
            const turmas = await service.listarTurmasDisponiveis(req.params.cursoId, req.query.alunoId as string | undefined);
            res.status(200).json(turmas);
        } catch (err: any) {
            this.erro(res, err);
        }
    }

    async criarMatricula(req: any, res: any) {
        try {
            const { alunoId, turmaDisciplinaId, turmaId } = req.body;
            const mat = await service.criarMatricula(alunoId, turmaDisciplinaId ?? turmaId);
            res.status(201).json(mat);
        } catch (err: any) {
            this.erro(res, err);
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

    async consultarStatus(req: any, res: any) {
        try {
            const matricula = parseInt(req.params.matricula, 10);
            if (isNaN(matricula)) return res.status(400).json({ error: 'Número de matrícula deve ser um inteiro.' });
            res.status(200).json(await service.consultarStatusPorMatricula(matricula));
        } catch (err: any) {
            const status = err.message.includes("não encontrado") ? 404 : 400;
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

    private erro(res: any, err: unknown) {
        if (err instanceof MatriculaError) return res.status(err.status).json({ error: err.message });
        console.error("Erro no módulo de matrícula:", err);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}
