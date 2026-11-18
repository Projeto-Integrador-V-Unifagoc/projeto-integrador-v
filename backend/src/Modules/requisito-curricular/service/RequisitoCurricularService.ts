import { v4 as uuidv4 } from "uuid";
import { MatrizCurricularRepository } from "../../matriz-curricular/repository/MatrizCurricularRepository";
import { RequisitoCurricularRepository } from "../repository/RequisitoCurricularRepository";

const TIPOS = ["OBRIGATORIO", "RECOMENDADO"] as const;

export class RequisitoCurricularService {
  repository = new RequisitoCurricularRepository();
  matrizRepository = new MatrizCurricularRepository();

  async listar(matrizId: string) {
    if (!await this.matrizRepository.buscarPorId(matrizId)) throw this.erro("Matriz curricular nao encontrada", 404);
    return this.repository.listarPorMatriz(matrizId).then((rows) => rows.map((item: any) => ({
      id: String(item.id), tipo: item.tipo, cursoDisciplinaId: String(item.curso_disciplina_id),
      disciplina: { id: String(item.disciplina_id), codigo: item.disciplina_codigo, nome: item.disciplina_nome },
      requisito: {
        cursoDisciplinaId: String(item.requisito_curso_disciplina_id), id: String(item.requisito_disciplina_id),
        codigo: item.requisito_codigo, nome: item.requisito_nome, periodoIdeal: item.requisito_periodo_ideal === null ? null : Number(item.requisito_periodo_ideal),
      },
    })));
  }

  async criar(data: any) {
    const cursoDisciplinaId = String(data.cursoDisciplinaId ?? "");
    const requisitoId = String(data.requisitoCursoDisciplinaId ?? "");
    const tipo = this.validarTipo(data.tipo);
    if (!cursoDisciplinaId || !requisitoId) throw this.erro("Disciplina e requisito sao obrigatorios", 400);
    if (cursoDisciplinaId === requisitoId) throw this.erro("Uma disciplina nao pode ser requisito dela mesma", 400);
    const [destino, requisito] = await Promise.all([this.repository.buscarItem(cursoDisciplinaId), this.repository.buscarItem(requisitoId)]);
    if (!destino || !requisito) throw this.erro("Disciplina da matriz nao encontrada", 404);
    if (String(destino.matriz_curricular_id) !== String(requisito.matriz_curricular_id)) throw this.erro("O requisito deve pertencer a mesma versao da matriz", 400);
    if (destino.matriz_status !== "RASCUNHO") throw this.erro("Requisitos so podem ser alterados em matriz em rascunho", 409);
    if (await this.repository.buscarRelacao(cursoDisciplinaId, requisitoId)) throw this.erro("Requisito ja associado a disciplina", 409);
    const arestas = await this.repository.listarArestas(String(destino.matriz_curricular_id));
    if (this.formaCiclo(cursoDisciplinaId, requisitoId, arestas)) throw this.erro("O requisito criaria um ciclo na matriz curricular", 409);
    return this.repository.criar({ id: uuidv4(), curso_disciplina_id: cursoDisciplinaId, requisito_curso_disciplina_id: requisitoId, tipo });
  }

  async atualizar(id: string, data: any) {
    const atual = await this.repository.buscarPorId(id);
    if (!atual) throw this.erro("Requisito curricular nao encontrado", 404);
    if (atual.matriz_status !== "RASCUNHO") throw this.erro("Requisitos so podem ser alterados em matriz em rascunho", 409);
    return this.repository.atualizar(id, this.validarTipo(data.tipo));
  }

  async remover(id: string) {
    const atual = await this.repository.buscarPorId(id);
    if (!atual) throw this.erro("Requisito curricular nao encontrado", 404);
    if (atual.matriz_status !== "RASCUNHO") throw this.erro("Requisitos so podem ser removidos de matriz em rascunho", 409);
    return this.repository.remover(id);
  }

  private formaCiclo(destinoId: string, requisitoId: string, arestas: any[]) {
    const grafo = new Map<string, string[]>();
    for (const aresta of arestas) {
      const origem = String(aresta.curso_disciplina_id);
      if (!grafo.has(origem)) grafo.set(origem, []);
      grafo.get(origem)!.push(String(aresta.requisito_curso_disciplina_id));
    }
    const visitar = [requisitoId];
    const visitados = new Set<string>();
    while (visitar.length) {
      const atual = visitar.pop()!;
      if (atual === destinoId) return true;
      if (visitados.has(atual)) continue;
      visitados.add(atual);
      visitar.push(...(grafo.get(atual) ?? []));
    }
    return false;
  }

  private validarTipo(valor: unknown) {
    const tipo = String(valor ?? "OBRIGATORIO").toUpperCase();
    if (!(TIPOS as readonly string[]).includes(tipo)) throw this.erro("Tipo de requisito invalido", 400);
    return tipo;
  }
  private erro(message: string, status: number) { return Object.assign(new Error(message), { status }); }
}

