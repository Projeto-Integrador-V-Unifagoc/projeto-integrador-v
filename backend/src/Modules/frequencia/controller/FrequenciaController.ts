import { FrequenciaService } from "../service/FrequenciaService";

export class FrequenciaController {
  frequenciaService = new FrequenciaService();

  async registrarFrequencia(req: any, res: any) {
    try {
      const frequencia = await this.frequenciaService.registrarFrequencia(req.body, req);
      res.status(201).json(frequencia);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}
