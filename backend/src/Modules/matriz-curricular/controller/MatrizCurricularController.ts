import type { Request, Response } from "express";
import { MatrizCurricularService } from "../service/MatrizCurricularService";

export class MatrizCurricularController {
  service = new MatrizCurricularService();
  listar = async (req: Request, res: Response) => this.executar(res, () => this.service.listar(String(req.params.cursoId)));
  buscar = async (req: Request, res: Response) => this.executar(res, () => this.service.buscar(String(req.params.id)));
  criar = async (req: Request, res: Response) => this.executar(res, () => this.service.criar(String(req.params.cursoId), req.body), 201);
  atualizar = async (req: Request, res: Response) => this.executar(res, () => this.service.atualizar(String(req.params.id), req.body));
  publicar = async (req: Request, res: Response) => this.executar(res, () => this.service.publicar(String(req.params.id), req.body?.encerrarVigente === true));

  private async executar(res: Response, operacao: () => Promise<any>, sucesso = 200) {
    try { res.status(sucesso).json(await operacao()); }
    catch (error: any) { res.status(Number(error?.status) || 400).json({ error: error?.message || "Erro na matriz curricular" }); }
  }
}
