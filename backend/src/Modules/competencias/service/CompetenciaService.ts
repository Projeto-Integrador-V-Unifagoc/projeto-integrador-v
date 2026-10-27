import { v4 as uuidv4 } from "uuid";
import type { CompetenciaCommand, TipoCompetencia } from "../models/Competencia";
import { CompetenciaRepository } from "../repository/CompetenciaRepository";

const TIPOS = new Set<TipoCompetencia>(["GERAL", "TECNICA", "SOCIOEMOCIONAL"]);

export class CompetenciaService {
  repository = new CompetenciaRepository();

  listar(query: any) {
    const ativo = query.ativo === undefined ? undefined : String(query.ativo).toLowerCase() === "true";
    const tipo = query.tipo ? this.tipo(query.tipo) : undefined;
    return this.repository.listar({ q: this.opcional(query.q), tipo, ativo });
  }

  buscarPorId(id: string) {
    return this.repository.buscarPorId(id);
  }

  async criar(data: any) {
    const comando = this.comando(data);
    if (await this.repository.buscarPorCodigo(comando.codigo)) throw new Error("Ja existe competencia com este codigo");
    return this.repository.criar(comando);
  }

  async atualizar(id: string, data: any) {
    const atual = await this.repository.buscarPorId(id);
    if (!atual) return null;
    const comando = this.comando({ ...atual, ...data }, id);
    if (comando.codigo !== atual.codigo) {
      const duplicada = await this.repository.buscarPorCodigo(comando.codigo);
      if (duplicada && duplicada.id !== id) throw new Error("Ja existe competencia com este codigo");
    }
    const dadosAtualizacao: any = { ...comando, updated_at: new Date().toISOString() };
    delete dadosAtualizacao.id;
    return this.repository.atualizar(id, dadosAtualizacao);
  }

  async alterarStatus(id: string, ativo: boolean) {
    if (!await this.repository.buscarPorId(id)) return null;
    return this.repository.atualizar(id, { ativo, updated_at: new Date().toISOString() } as any);
  }

  async remover(id: string) {
    if (await this.repository.possuiVinculos(id)) {
      const erro = new Error("Competencia esta vinculada a disciplinas; desative-a em vez de excluir");
      (erro as any).status = 409;
      throw erro;
    }
    return this.repository.remover(id);
  }

  private comando(data: any, id = uuidv4()): CompetenciaCommand {
    return {
      id,
      codigo: this.obrigatorio(data.codigo, "Informe o codigo da competencia").toUpperCase(),
      nome: this.obrigatorio(data.nome, "Informe o nome da competencia"),
      descricao: this.obrigatorio(data.descricao, "Informe a descricao da competencia"),
      tipo: this.tipo(data.tipo),
      ativo: data.ativo ?? true,
    };
  }

  private tipo(valor: unknown) {
    const tipo = String(valor ?? "").trim().toUpperCase() as TipoCompetencia;
    if (!TIPOS.has(tipo)) throw new Error("Tipo de competencia invalido");
    return tipo;
  }

  private obrigatorio(valor: unknown, mensagem: string) {
    const texto = String(valor ?? "").trim();
    if (!texto) throw new Error(mensagem);
    return texto;
  }

  private opcional(valor: unknown) {
    const texto = String(valor ?? "").trim();
    return texto || undefined;
  }
}
