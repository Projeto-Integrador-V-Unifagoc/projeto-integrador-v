import { CursoService } from "../service/CursoService";

export default class CursoController {
    cursoService = new CursoService();

    async criarCurso(req: any, res: any) {
        try {
            const curso = await this.cursoService.criarCurso(req.body);
            res.status(201).json(curso);
        } catch (error) {
            res.status(500).json({ error: "Erro ao criar curso" });
        }
    }

    async listarCursos(req: any, res: any) {
        try {
            const cursos = await this.cursoService.listarCursos();
            res.status(200).json(cursos);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar cursos" });
        }
    }

    async buscarCursoPorId(req: any, res: any) {
        try {
            const curso = await this.cursoService.buscarCursoPorId(req.params.id);
            if (!curso) {
                return res.status(404).json({ error: "Curso não encontrado" });
            }
            res.status(200).json(curso);
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar curso" });
        }
    }
}