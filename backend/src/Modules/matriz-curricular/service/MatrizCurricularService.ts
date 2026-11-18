import { v4 as uuidv4 } from "uuid";
import { CursoRepository } from "../../modulo-facul-dp-curso/repository/CursoRepository";
import { MatrizCurricularRepository } from "../repository/MatrizCurricularRepository";

export class MatrizCurricularService {
  repository = new MatrizCurricularRepository();
  cursoRepository = new CursoRepository();

  async listar(cursoId: string) {
    await this.validarCurso(cursoId);
    return this.repository.listarPorCurso(cursoId);
  }

  async buscar(id: string) {
    const matriz = await this.repository.buscarPorId(id);
    if (!matriz) throw Object.assign(new Error("Matriz curricular nao encontrada"), { status: 404 });
    return matriz;
  }

  async criar(cursoId: string, data: any) {
    await this.validarCurso(cursoId);
    const codigo = String(data.codigo ?? "").trim().toUpperCase();
    const versao = String(data.versao ?? "").trim();
    const vigenciaInicio = this.validarData(data.vigenciaInicio, "Data inicial de vigencia invalida");
    if (!codigo || codigo.length > 60) throw Object.assign(new Error("Codigo da matriz e obrigatorio e deve ter ate 60 caracteres"), { status: 400 });
    if (!versao || versao.length > 60) throw Object.assign(new Error("Versao da matriz e obrigatoria e deve ter ate 60 caracteres"), { status: 400 });
    try {
      return await this.repository.criar({
        id: uuidv4(), curso_id: cursoId, codigo, versao, status: "RASCUNHO",
        vigencia_inicio: vigenciaInicio, vigencia_fim: null, publicada_em: null,
      }, data.matrizOrigemId || undefined);
    } catch (error: any) {
      if (error?.code === "23505") throw Object.assign(new Error("Ja existe uma matriz com este codigo no curso"), { status: 409 });
      throw error;
    }
  }

  async atualizar(id: string, data: any) {
    const atual = await this.buscar(id);
    if (atual.status !== "RASCUNHO") throw Object.assign(new Error("Somente matrizes em rascunho podem ser alteradas"), { status: 409 });
    const payload: Record<string, unknown> = {};
    if (data.codigo !== undefined) {
      const codigo = String(data.codigo).trim().toUpperCase();
      if (!codigo || codigo.length > 60) throw Object.assign(new Error("Codigo da matriz invalido"), { status: 400 });
      payload.codigo = codigo;
    }
    if (data.versao !== undefined) {
      const versao = String(data.versao).trim();
      if (!versao || versao.length > 60) throw Object.assign(new Error("Versao da matriz invalida"), { status: 400 });
      payload.versao = versao;
    }
    if (data.vigenciaInicio !== undefined) payload.vigencia_inicio = this.validarData(data.vigenciaInicio, "Data inicial de vigencia invalida");
    return this.repository.atualizar(id, payload);
  }

  async publicar(id: string, encerrarVigente = false) {
    await this.buscar(id);
    return this.repository.publicar(id, encerrarVigente);
  }

  private async validarCurso(cursoId: string) {
    if (!await this.cursoRepository.buscarCursoRegistroPorId(cursoId)) {
      throw Object.assign(new Error("Curso nao encontrado"), { status: 404 });
    }
  }

  private validarData(valor: unknown, mensagem: string) {
    const texto = String(valor ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(new Date(`${texto}T12:00:00`).getTime())) {
      throw Object.assign(new Error(mensagem), { status: 400 });
    }
    return texto;
  }
}
