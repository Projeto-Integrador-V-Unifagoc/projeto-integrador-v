import { FrequenciaService } from "../service/FrequenciaService";

export class FrequenciaController {
  frequenciaService = new FrequenciaService();

  async listarOpcoes(req: any, res: any) {
    try {
      res.status(200).json(await this.frequenciaService.listarOpcoes());
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async obterChamada(req: any, res: any) {
    try {
      const turmaDisciplinaId = req.query.turmaDisciplinaId || req.query.turmaId;
      res.status(200).json(await this.frequenciaService.obterChamada(turmaDisciplinaId, req.query.data));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async registrarFrequencia(req: any, res: any) {
    try {
      const frequencia = await this.frequenciaService.registrarFrequencia();
      res.status(201).json(frequencia);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async editarFrequencia(req: any, res: any) {
    try {
      res.status(200).json(await this.frequenciaService.editarFrequencia(req.params.id, req.body));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async removerFrequencia(req: any, res: any) {
    try {
      res.status(200).json(await this.frequenciaService.removerFrequencia(req.params.id));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async consultarAluno(req: any, res: any) {
    try {
      res.status(200).json(await this.frequenciaService.consultarAluno(req.params.alunoId));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async consultarTurma(req: any, res: any) {
    try {
      res.status(200).json(await this.frequenciaService.consultarTurma(req.params.turmaId));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async registrarJustificativa(req: any, res: any) {
    try {
      res
        .status(200)
        .json(await this.frequenciaService.registrarJustificativa(req.params.id, req.body.justificativa));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async gerarRelatorio(req: any, res: any) {
    try {
      res.status(200).json(await this.frequenciaService.gerarRelatorio(req.query));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}
