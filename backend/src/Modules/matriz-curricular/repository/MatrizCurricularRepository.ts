import { v4 as uuidv4 } from "uuid";
import { db } from "../../../database/connection";
import type { MatrizCurricularCommand } from "../models/MatrizCurricular";

export class MatrizCurricularRepository {
  listarPorCurso(cursoId: string) {
    return db("matriz_curricular as mc")
      .where("mc.curso_id", cursoId)
      .select("mc.*")
      .select(db.raw("(SELECT COUNT(*)::int FROM piv.curso_disciplina cd WHERE cd.matriz_curricular_id = mc.id) AS total_disciplinas"))
      .select(db.raw("(SELECT COALESCE(SUM(cd.carga_horaria), 0)::int FROM piv.curso_disciplina cd WHERE cd.matriz_curricular_id = mc.id AND cd.ativo = true) AS carga_horaria_total"))
      .select(db.raw("(SELECT COUNT(*)::int FROM piv.turma t WHERE t.matriz_curricular_id = mc.id) AS total_turmas"))
      .orderByRaw("CASE mc.status WHEN 'VIGENTE' THEN 0 WHEN 'RASCUNHO' THEN 1 ELSE 2 END")
      .orderBy("mc.vigencia_inicio", "desc");
  }

  buscarPorId(id: string) {
    return db("matriz_curricular as mc")
      .join("curso as c", "mc.curso_id", "c.id")
      .where("mc.id", id)
      .select("mc.*", "c.codigo as curso_codigo", "c.nome as curso_nome")
      .first();
  }

  buscarVigentePorCurso(cursoId: string) {
    return db("matriz_curricular").where({ curso_id: cursoId, status: "VIGENTE" }).first();
  }

  async criar(data: MatrizCurricularCommand, matrizOrigemId?: string) {
    return db.transaction(async (trx) => {
      if (matrizOrigemId) {
        const origem = await trx("matriz_curricular").where({ id: matrizOrigemId, curso_id: data.curso_id }).first();
        if (!origem) throw Object.assign(new Error("Matriz de origem nao pertence ao curso"), { status: 400 });
      }
      const [matriz] = await trx("matriz_curricular").insert(data).returning("*");
      if (matrizOrigemId) {
        const itens = await trx("curso_disciplina").where({ matriz_curricular_id: matrizOrigemId });
        if (itens.length) {
          const clones = itens.map((item: any) => ({ origemId: String(item.id), novoId: uuidv4(), item }));
          await trx("curso_disciplina").insert(clones.map(({ novoId, item }) => ({
            id: novoId, curso_id: data.curso_id, matriz_curricular_id: data.id, disciplina_id: item.disciplina_id,
            periodo_ideal: item.periodo_ideal, obrigatoria: item.obrigatoria, carga_horaria: item.carga_horaria, ativo: item.ativo,
          })));
          const ids = clones.map((item) => item.origemId);
          const requisitos = await trx("curso_disciplina_requisito")
            .whereIn("curso_disciplina_id", ids)
            .whereIn("requisito_curso_disciplina_id", ids);
          const novosIds = new Map(clones.map((item) => [item.origemId, item.novoId]));
          if (requisitos.length) {
            await trx("curso_disciplina_requisito").insert(requisitos.map((requisito: any) => ({
              id: uuidv4(), curso_disciplina_id: novosIds.get(String(requisito.curso_disciplina_id)),
              requisito_curso_disciplina_id: novosIds.get(String(requisito.requisito_curso_disciplina_id)), tipo: requisito.tipo,
            })));
          }
        }
      }
      return matriz;
    });
  }

  atualizar(id: string, data: Record<string, unknown>) {
    return db("matriz_curricular").where({ id }).update({ ...data, updated_at: db.fn.now() }).returning("*").then((rows) => rows[0] ?? null);
  }

  async publicar(id: string, encerrarVigente: boolean) {
    return db.transaction(async (trx) => {
      const matriz = await trx("matriz_curricular").where({ id }).forUpdate().first();
      if (!matriz) return null;
      if (matriz.status !== "RASCUNHO") throw Object.assign(new Error("Somente matriz em rascunho pode ser publicada"), { status: 409 });
      const total = Number((await trx("curso_disciplina").where({ matriz_curricular_id: id, ativo: true }).count({ total: "id" }).first())?.total ?? 0);
      if (!total) throw Object.assign(new Error("A matriz precisa possuir ao menos uma disciplina ativa"), { status: 400 });
      const vigente = await trx("matriz_curricular").where({ curso_id: matriz.curso_id, status: "VIGENTE" }).whereNot({ id }).forUpdate().first();
      if (vigente && !encerrarVigente) {
        throw Object.assign(new Error("O curso ja possui matriz vigente. Confirme o encerramento para publicar a nova versao"), { status: 409 });
      }
      if (vigente) {
        if (new Date(`${matriz.vigencia_inicio}T12:00:00`).getTime() <= new Date(`${vigente.vigencia_inicio}T12:00:00`).getTime()) {
          throw Object.assign(new Error("A nova vigencia deve iniciar depois da matriz vigente atual"), { status: 409 });
        }
        await trx("matriz_curricular").where({ id: vigente.id }).update({
          status: "ENCERRADA",
          vigencia_fim: trx.raw("(?::date - INTERVAL '1 day')::date", [matriz.vigencia_inicio]),
          updated_at: trx.fn.now(),
        });
      }
      const [publicada] = await trx("matriz_curricular").where({ id }).update({
        status: "VIGENTE", publicada_em: trx.fn.now(), vigencia_fim: null, updated_at: trx.fn.now(),
      }).returning("*");
      return publicada;
    });
  }
}
