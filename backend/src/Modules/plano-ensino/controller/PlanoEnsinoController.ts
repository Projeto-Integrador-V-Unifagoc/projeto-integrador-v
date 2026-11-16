import type { Request, Response } from "express";
import { PlanoEnsinoService } from "../service/PlanoEnsinoService";
export class PlanoEnsinoController {
  service = new PlanoEnsinoService();
  listar = async (req: Request, res: Response) => { try { res.json(await this.service.listar(req, String(req.params.ofertaId))); } catch (e) { res.status((e as any).status ?? 400).json({ error: (e as Error).message }); } };
  criar = async (req: Request, res: Response) => { try { res.status(201).json(await this.service.criar(req, String(req.params.ofertaId))); } catch (e) { res.status((e as any).status ?? 400).json({ error: (e as Error).message }); } };
  atualizar = async (req: Request, res: Response) => { try { res.json(await this.service.atualizar(req, String(req.params.id), req.body)); } catch (e) { res.status((e as any).status ?? 400).json({ error: (e as Error).message }); } };
  submeter = async (req: Request, res: Response) => { try { res.json(await this.service.submeter(req, String(req.params.id))); } catch (e) { res.status((e as any).status ?? 400).json({ error: (e as Error).message }); } };
  aprovar = async (req: Request, res: Response) => { try { res.json(await this.service.aprovar(req, String(req.params.id))); } catch (e) { res.status((e as any).status ?? 400).json({ error: (e as Error).message }); } };
  arquivar = async (req: Request, res: Response) => { try { res.json(await this.service.arquivar(req, String(req.params.id))); } catch (e) { res.status((e as any).status ?? 400).json({ error: (e as Error).message }); } };
}

