import { test, expect } from "../fixtures/test.js";
import type { Cenario } from "../fixtures/academic.fixture.js";
import { datasRecentes } from "../helpers/dominio.js";
import { contar, db, garantirLocal } from "../helpers/db.js";

function diaSemana(data: string): number {
  const dia = new Date(`${data}T12:00:00Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
}

const localDoCenario = (cenario: Cenario) => `E2E-CAL-${cenario.runId}`.slice(0, 120);

async function criarHorario(
  cenario: Cenario,
  data: string,
  horaInicio: string,
  horaFim: string,
) {
  return cenario.apiSecretaria.post(`/turmas-disciplinas/${cenario.turmaDisciplinaId}/horarios`, {
    body: {
      diaSemana: diaSemana(data),
      horaInicio,
      horaFim,
      local: localDoCenario(cenario),
      vigenciaInicio: data,
      vigenciaFim: data,
      ativo: true,
    },
  });
}

test.describe("Calendário acadêmico e ocorrências @api", () => {
  test("simula, gera sem duplicar e preserva aula que já possui chamada", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const matriculado = await cenario.matricularAluno();
    const [data, dataForaDoIntervalo] = datasRecentes(2);
    const localId = await garantirLocal(localDoCenario(cenario));

    const horario = await criarHorario(cenario, data, "08:00", "09:40");
    expect(horario.status).toBe(201);
    const horarioFora = await criarHorario(cenario, dataForaDoIntervalo, "14:00", "15:40");
    expect(horarioFora.status).toBe(201);
    const geracaoFora = await cenario.apiSecretaria.post(`/periodos-letivos/${cenario.periodoLetivoId}/aulas/gerar`, {
      body: { dataInicio: dataForaDoIntervalo, dataFim: dataForaDoIntervalo, simular: false },
    });
    expect(geracaoFora.body.criadas).toBe(1);

    const evento = await cenario.apiSecretaria.post(`/periodos-letivos/${cenario.periodoLetivoId}/calendario`, {
      body: { tipo: "SUSPENSAO", titulo: "Suspensão E2E", dataInicio: data, dataFim: data, bloqueiaAulas: true },
    });
    expect(evento.status).toBe(201);

    const bloqueada = await cenario.apiSecretaria.post(`/periodos-letivos/${cenario.periodoLetivoId}/aulas/gerar`, {
      body: { dataInicio: data, dataFim: data, simular: true },
    });
    expect(bloqueada.status).toBe(200);
    expect(bloqueada.body).toMatchObject({ simulado: true, ocorrenciasPrevistas: 0, excluidasPorCalendario: 1 });

    expect((await cenario.apiSecretaria.del(`/calendario-academico/eventos/${evento.body.id}`)).status).toBe(204);
    const primeira = await cenario.apiSecretaria.post(`/periodos-letivos/${cenario.periodoLetivoId}/aulas/gerar`, {
      body: { dataInicio: data, dataFim: data, simular: false },
    });
    expect(primeira.body).toMatchObject({ criadas: 1, existentes: 0 });
    expect(await contar("aula", { horario_turma_disciplina_id: horarioFora.body.id, status: "PLANEJADA" })).toBe(1);
    const repetida = await cenario.apiSecretaria.post(`/periodos-letivos/${cenario.periodoLetivoId}/aulas/gerar`, {
      body: { dataInicio: data, dataFim: data, simular: false },
    });
    expect(repetida.body).toMatchObject({ criadas: 0, existentes: 1 });

    const chamada = await cenario.apiProfessor.get("/frequencias/chamada", {
      query: { turmaDisciplinaId: cenario.turmaDisciplinaId, data },
    });
    expect(chamada.status).toBe(200);
    expect(chamada.body.ocorrencias).toHaveLength(1);
    const aulaId = chamada.body.ocorrencias[0].id;
    const salva = await cenario.apiProfessor.post("/frequencias", {
      body: {
        turmaDisciplinaId: cenario.turmaDisciplinaId,
        aulaId,
        localId,
        data,
        registros: [{ alunoId: matriculado.aluno.id, status: "PRESENTE" }],
      },
    });
    expect(salva.status).toBe(200);

    const novaSuspensao = await cenario.apiSecretaria.post(`/periodos-letivos/${cenario.periodoLetivoId}/calendario`, {
      body: { tipo: "FERIADO", titulo: "Feriado E2E", dataInicio: data, dataFim: data, bloqueiaAulas: true },
    });
    const sincronizada = await cenario.apiSecretaria.post(`/periodos-letivos/${cenario.periodoLetivoId}/aulas/gerar`, {
      body: { dataInicio: data, dataFim: data, simular: false },
    });
    expect(sincronizada.body).toMatchObject({ canceladas: 0, preservadasComChamada: 1 });
    expect(await contar("aula", { id: aulaId, status: "REALIZADA" })).toBe(1);
    expect(await contar("frequencia", { aula_id: aulaId })).toBe(1);
    await cenario.apiSecretaria.del(`/calendario-academico/eventos/${novaSuspensao.body.id}`);
  });

  test("duas ocorrências no mesmo dia exigem a escolha do horário da chamada", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const matriculado = await cenario.matricularAluno();
    const [data] = datasRecentes(2);
    await garantirLocal(localDoCenario(cenario));
    expect((await criarHorario(cenario, data, "08:00", "09:40")).status).toBe(201);
    expect((await criarHorario(cenario, data, "10:00", "11:40")).status).toBe(201);

    const geracao = await cenario.apiSecretaria.post(`/periodos-letivos/${cenario.periodoLetivoId}/aulas/gerar`, {
      body: { dataInicio: data, dataFim: data, simular: false },
    });
    expect(geracao.body.criadas).toBe(2);

    const chamada = await cenario.apiProfessor.get("/frequencias/chamada", {
      query: { turmaDisciplinaId: cenario.turmaDisciplinaId, data },
    });
    expect(chamada.body.requerSelecaoOcorrencia).toBe(true);
    expect(chamada.body.ocorrencias).toHaveLength(2);

    const semSelecao = await cenario.apiProfessor.post("/frequencias", {
      body: {
        turmaDisciplinaId: cenario.turmaDisciplinaId,
        data,
        registros: [{ alunoId: matriculado.aluno.id, status: "PRESENTE" }],
      },
    });
    expect(semSelecao.status).toBe(400);
    expect(JSON.stringify(semSelecao.body)).toMatch(/ocorr.ncia|hor.rio|selecione/i);

    const aulaId = chamada.body.ocorrencias[0].id;
    const selecionada = await cenario.apiProfessor.post("/frequencias", {
      body: {
        turmaDisciplinaId: cenario.turmaDisciplinaId,
        aulaId,
        data,
        registros: [{ alunoId: matriculado.aluno.id, status: "PRESENTE" }],
      },
    });
    expect(selecionada.status).toBe(200);
    expect(await contar("frequencia", { aula_id: aulaId })).toBe(1);
    expect(await db()("piv.aula").where({ turma_disciplina_id: cenario.turmaDisciplinaId }).count("id as total").first()).toMatchObject({ total: "2" });
  });
});
