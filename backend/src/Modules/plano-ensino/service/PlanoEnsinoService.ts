import type { Request } from "express";
import { v4 as uuidv4 } from "uuid";
import { PlanoEnsinoRepository } from "../repository/PlanoEnsinoRepository";

const CAMPOS = ["temaApresentacao", "objetivoGeral", "objetivosEspecificos", "metodologia", "conhecimentosHabilidadesAtitudes", "bibliografiaBasica", "bibliografiaComplementar", "estrategiasPedagogicas", "programaAvaliacao", "recursosDidaticos", "cronograma", "observacoes"];
const OBRIGATORIOS = ["objetivoGeral", "objetivosEspecificos", "metodologia", "bibliografiaBasica", "programaAvaliacao", "cronograma"];

export class PlanoEnsinoService {
  repository = new PlanoEnsinoRepository();

  async listar(req: Request, ofertaId: string) { await this.contexto(req, ofertaId); return this.repository.listar(ofertaId); }
  async criar(req: Request, ofertaId: string) {
    const ctx = await this.contexto(req, ofertaId); const existentes = await this.repository.listar(ofertaId);
    if (existentes.some((p: any) => p.status === "RASCUNHO" || p.status === "SUBMETIDO")) throw this.erro("Ja existe um plano em elaboracao para esta oferta", 409);
    const anterior: any = existentes[0];
    return this.repository.criar({ id: uuidv4(), turma_disciplina_id: ofertaId, versao: await this.repository.proximaVersao(ofertaId), status: "RASCUNHO", responsavel_professor_id: ctx.oferta.professor_id, conteudo: anterior?.conteudo ?? {} });
  }
  async atualizar(req: Request, id: string, data: any) {
    const plano = await this.planoAutorizado(req, id); if (plano.status !== "RASCUNHO") throw this.erro("Somente planos em rascunho podem ser editados", 409);
    return this.repository.atualizar(id, { conteudo: this.conteudo(data) });
  }
  async submeter(req: Request, id: string) {
    const plano = await this.planoAutorizado(req, id); if (plano.status !== "RASCUNHO") throw this.erro("Somente planos em rascunho podem ser submetidos", 409);
    const faltantes = OBRIGATORIOS.filter((campo) => !String(plano.conteudo?.[campo] ?? "").trim());
    if (faltantes.length) throw this.erro(`Preencha os campos obrigatorios: ${faltantes.join(", ")}`, 400);
    return this.repository.atualizar(id, { status: "SUBMETIDO", submetido_em: new Date() });
  }
  async aprovar(req: Request, id: string) {
    const perfil = this.perfil(req); if (!this.ehAdmin(perfil)) throw this.erro("Apenas secretaria ou administrador pode aprovar", 403);
    const plano: any = await this.repository.buscar(id); if (!plano) throw this.erro("Plano de ensino nao encontrado", 404);
    if (plano.status !== "SUBMETIDO") throw this.erro("Somente planos submetidos podem ser aprovados", 409);
    const oferta: any = await this.repository.buscarOferta(plano.turma_disciplina_id); const competencias = await this.repository.listarCompetencias(oferta.disciplina_id);
    return this.repository.aprovar(id, plano.turma_disciplina_id, { snapshot_ementa: oferta.ementa ?? null, snapshot_competencias: JSON.stringify(competencias), aprovado_por_usuario_id: (req as any).user.id });
  }
  async arquivar(req: Request, id: string) {
    if (!this.ehAdmin(this.perfil(req))) throw this.erro("Apenas secretaria ou administrador pode arquivar", 403);
    const plano: any = await this.repository.buscar(id); if (!plano) throw this.erro("Plano de ensino nao encontrado", 404);
    if (plano.status === "ARQUIVADO") return plano;
    return this.repository.atualizar(id, { status: "ARQUIVADO", arquivado_em: new Date() });
  }
  private async planoAutorizado(req: Request, id: string) { const plano: any = await this.repository.buscar(id); if (!plano) throw this.erro("Plano de ensino nao encontrado", 404); await this.contexto(req, plano.turma_disciplina_id); return plano; }
  private async contexto(req: Request, ofertaId: string) {
    const oferta: any = await this.repository.buscarOferta(ofertaId); if (!oferta) throw this.erro("Oferta de disciplina nao encontrada", 404);
    const perfil = this.perfil(req); if (this.ehAdmin(perfil)) return { perfil, oferta };
    if (perfil !== "professor") throw this.erro("Acesso negado ao plano de ensino", 403);
    const professor: any = await this.repository.buscarProfessorPorUsuario(String((req as any).user.id));
    if (!professor?.id || professor.ativo === false || String(professor.id) !== String(oferta.professor_id)) throw this.erro("Professor nao responsavel por esta oferta", 403);
    return { perfil, oferta, professor };
  }
  private conteudo(data: any) { return Object.fromEntries(CAMPOS.map((campo) => [campo, String(data?.[campo] ?? "").trim()])); }
  private perfil(req: Request) { return String((req as any).user?.tipo_usuario ?? "").toLowerCase(); }
  private ehAdmin(perfil: string) { return perfil === "secretaria" || perfil === "administrador"; }
  private erro(message: string, status: number) { return Object.assign(new Error(message), { status }); }
}

