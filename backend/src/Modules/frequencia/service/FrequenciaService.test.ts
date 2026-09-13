import { describe, it, expect } from "vitest";
import { FrequenciaService } from "./FrequenciaService";

const turmaId = "11111111-1111-4111-8111-111111111111";
const alunoId = "22222222-2222-4222-8222-222222222222";
const professorId = "33333333-3333-4333-8333-333333333333";
const matriculaId = "44444444-4444-4444-8444-444444444444";
const usuarioId = "77777777-7777-4777-8777-777777777777";
const localId = "88888888-8888-4888-8888-888888888888";
const reqProfessor = { user: { id: usuarioId, tipo_usuario: "professor" } } as any;

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    buscarUsuarioPorId: async () => ({ id: usuarioId, tipo_usuario: "professor" }),
    buscarProfessorPorUsuarioId: async () => ({ id: professorId, ativo: true }),
    buscarAlunoPorUsuarioId: async () => ({ id: alunoId }),
    professorPossuiTurma: async () => true,
    professorPossuiAluno: async () => true,
    listarTurmas: async () => [], listarLocais: async () => [],
    buscarTurma: async () => ({ id: turmaId, data_inicio: "2026-01-01", data_fim: "2026-12-20", periodo_ativo: true, periodo_status: "ativo", periodo_codigo: "2026/1" }),
    listarAlunosAtivosDaTurma: async () => [{ aluno_id: alunoId, matricula_turma_disciplina_id: matriculaId, nome: "Aluno Teste", matricula: 1, status: "ativa" }],
    listarRegistrosDaChamada: async () => [], contarMatriculasIrregulares: async () => 0,
    calcularPercentualMatriculaTurmaDisciplina: async () => 100,
    salvarChamadaAtomica: async (dados: any) => ({ aulaId: "55555555-5555-4555-8555-555555555555", registros: dados.registros }),
    buscarRegistroPorId: async () => null, salvarJustificativa: async () => ({}), listarHistoricoAluno: async () => [],
    buscarConsolidadoTurma: async () => ({ totalAulas: 0, rows: [] }),
    ...overrides,
  };
  return new FrequenciaService(repository as any);
}
const payload = () => ({ turmaDisciplinaId: turmaId, localId, data: "2026-05-01", registros: [{ alunoId, status: "PRESENTE" as const }] });

describe("FrequenciaService", () => {
  it("monta a chamada sem assumir presença para registro ainda não lançado", async () => {
    const result = await criar().obterChamada(turmaId, "2026-05-01", reqProfessor);
    expect(result.alunos[0].status).toBeNull(); expect(result.chamadaCompleta).toBe(false);
  });
  it("salva a chamada completa em uma operação atômica", async () => {
    let recebido: any; const service = criar({ salvarChamadaAtomica: async (d: any) => { recebido = d; return { aulaId: "aula", registros: d.registros }; } });
    const result = await service.salvarChamada(payload(), reqProfessor);
    expect(recebido.usuarioId).toBe(usuarioId); expect(recebido.registros[0].matriculaId).toBe(matriculaId); expect(result.registros.length).toBe(1);
  });
  it("rejeita aluno duplicado e chamada incompleta", async () => {
    const service = criar(); const p = payload(); p.registros.push({ alunoId, status: "PRESENTE" });
    await expect(service.salvarChamada(p, reqProfessor)).rejects.toThrow(/duplicado/);
    await expect(service.salvarChamada({ ...payload(), registros: [] }, reqProfessor)).rejects.toThrow(/chamada completa/);
  });
  it("rejeita data futura e fora do período real", async () => {
    await expect(criar().salvarChamada({ ...payload(), data: "2099-01-01" }, reqProfessor)).rejects.toThrow(/data futura/);
    await expect(criar().salvarChamada({ ...payload(), data: "2025-12-01" }, reqProfessor)).rejects.toThrow(/fora do período/);
  });
  it("aceita a data atual durante todo o dia local e rejeita datas inexistentes", async () => {
    const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const service = criar({ buscarTurma: async () => ({ id: turmaId, data_inicio: "2020-01-01", data_fim: "2099-12-31", periodo_ativo: true, periodo_status: "ativo" }) });
    await service.salvarChamada({ ...payload(), data: hoje }, reqProfessor);
    await expect(service.salvarChamada({ ...payload(), data: "2026-02-31" }, reqProfessor)).rejects.toThrow(/Data inválida/);
  });
  it("rejeita secretaria inexistente ou com perfil divergente do token", async () => {
    const reqSecretaria = { user: { id: usuarioId, tipo_usuario: "secretaria" } } as any;
    await expect(criar({ buscarUsuarioPorId: async () => null }).listarOpcoes(reqSecretaria)).rejects.toThrow(/identidade do token/i);
    await expect(criar({ buscarUsuarioPorId: async () => ({ id: usuarioId, tipo_usuario: "aluno" }) }).listarOpcoes(reqSecretaria)).rejects.toThrow(/identidade do token/i);
  });
  it("rejeita professor sem atribuição", async () => {
    await expect(criar({ professorPossuiTurma: async () => false }).salvarChamada(payload(), reqProfessor)).rejects.toThrow(/fora da atribuição/);
  });
  it("mapeia conflito concorrente para HTTP 409", async () => {
    const service = criar({ salvarChamadaAtomica: async () => { throw Object.assign(new Error(), { code: "23505" }); } });
    await expect(service.salvarChamada(payload(), reqProfessor)).rejects.toMatchObject({ status: 409 });
  });
  it("exige confirmação ao substituir justificativa e não altera o status", async () => {
    const registro = { id: localId, status: "AUSENTE", alunoId, turmaDisciplinaId: turmaId, motivoJustificativa: "Anterior" };
    const service = criar({ buscarRegistroPorId: async () => registro });
    await expect(service.registrarJustificativa(localId, { motivo: "Atestado" }, reqProfessor)).rejects.toMatchObject({ status: 409 });
  });
  it("classifica abaixo de 75 como risco, até 80 como alerta e acima como regular", async () => {
    const rows = [74, 80, 81].map((presencas, i) => ({ aluno_id: `${i}2222222-2222-4222-8222-222222222222`, aluno_nome: `Aluno ${i}`, turma_disciplina_id: turmaId, disciplina_id: localId, disciplina_nome: "Disciplina", registros: 100, presencas, faltas: 100 - presencas }));
    const r = await criar({ buscarConsolidadoTurma: async () => ({ totalAulas: 100, rows }) }).consultarTurma(turmaId, reqProfessor);
    expect(r.alunos.map((a) => a.situacao)).toEqual(["RISCO_REPROVACAO", "ALERTA", "REGULAR"]);
  });
  it("consolida uma turma de 50 alunos em menos de 2 segundos", async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ aluno_id: `${String(i).padStart(8, "0")}-2222-4222-8222-222222222222`, aluno_nome: `Aluno ${i}`, turma_disciplina_id: turmaId, disciplina_id: localId, disciplina_nome: "Disciplina", registros: 20, presencas: 18, faltas: 2 }));
    const inicio = performance.now();
    const r = await criar({ buscarConsolidadoTurma: async () => ({ totalAulas: 20, rows }) }).consultarTurma(turmaId, reqProfessor);
    expect(r.alunos.length).toBe(50); expect(performance.now() - inicio).toBeLessThan(2000);
  });

  it("listarOpcoes retorna locais apenas para o professor", async () => {
    const locais = [{ id: localId, nome: "Sala 1" }];
    const service = criar({
      listarTurmas: async () => [{ id: turmaId, turma_id: "t", turma_sigla: "A", turma_descricao: "Turma A", periodo_codigo: "2026/1", data_inicio: "2026-01-01", data_fim: "2026-12-20", periodo_status: "ativo", disciplina_id: "d", disciplina_codigo: "D1", disciplina_nome: "Disciplina", curso_id: "c", curso_nome: "Curso" }],
      listarLocais: async () => locais,
    });
    const r = await service.listarOpcoes(reqProfessor);
    expect(r.contexto.perfil).toBe("professor");
    expect(r.turmas).toHaveLength(1);
    expect(r.locais).toEqual(locais);

    const reqAlunoLocal = { user: { id: usuarioId, tipo_usuario: "aluno" } } as any;
    const serviceAluno = criar({
      buscarUsuarioPorId: async () => ({ id: usuarioId, tipo_usuario: "aluno" }),
      listarLocais: async () => locais,
    });
    const semLocais = await serviceAluno.listarOpcoes(reqAlunoLocal);
    expect(semLocais.locais).toEqual([]);
  });

  it("obterChamada rejeita turma/data invalida, bloqueia aluno e barra turma inexistente", async () => {
    await expect(criar().obterChamada("invalido", "2026-05-01", reqProfessor)).rejects.toMatchObject({ status: 400 });
    await expect(criar().obterChamada(turmaId, "data-ruim", reqProfessor)).rejects.toMatchObject({ status: 400 });
    const reqAluno = { user: { id: usuarioId, tipo_usuario: "aluno" } } as any;
    const serviceAluno = criar({ buscarUsuarioPorId: async () => ({ id: usuarioId, tipo_usuario: "aluno" }) });
    await expect(serviceAluno.obterChamada(turmaId, "2026-05-01", reqAluno)).rejects.toMatchObject({ status: 403 });
    const service = criar({ buscarTurma: async () => null });
    await expect(service.obterChamada(turmaId, "2026-05-01", reqProfessor)).rejects.toMatchObject({ status: 404 });
  });

  it("obterChamada permite secretaria consultar qualquer turma", async () => {
    const reqSecretaria = { user: { id: usuarioId, tipo_usuario: "secretaria" } } as any;
    const service = criar({ buscarUsuarioPorId: async () => ({ id: usuarioId, tipo_usuario: "secretaria" }) });
    const r = await service.obterChamada(turmaId, "2026-05-01", reqSecretaria);
    expect(r.turmaDisciplinaId).toBe(turmaId);
  });

  it("registrarFrequencia delega para salvarChamada", async () => {
    const service = criar();
    const r = await service.registrarFrequencia(payload(), reqProfessor);
    expect(r.mensagem).toMatch(/salva/);
  });

  describe("registrarJustificativa", () => {
    const registroBase = { id: localId, status: "AUSENTE", alunoId, turmaDisciplinaId: turmaId, motivoJustificativa: null };

    it("valida id, motivo e observacao", async () => {
      await expect(criar().registrarJustificativa("invalido", { motivo: "Atestado" }, reqProfessor)).rejects.toMatchObject({ status: 400 });
      await expect(criar().registrarJustificativa(localId, { motivo: "oi" }, reqProfessor)).rejects.toThrow(/entre 3 e 200/);
      await expect(criar().registrarJustificativa(localId, { motivo: "x".repeat(201) }, reqProfessor)).rejects.toThrow(/entre 3 e 200/);
      await expect(criar().registrarJustificativa(localId, { motivo: "Atestado", observacao: "y".repeat(1001) }, reqProfessor)).rejects.toThrow(/máximo 1000/);
    });

    it("bloqueia secretaria e trata registro nao encontrado", async () => {
      const reqSecretaria = { user: { id: usuarioId, tipo_usuario: "secretaria" } } as any;
      const serviceSecretaria = criar({ buscarUsuarioPorId: async () => ({ id: usuarioId, tipo_usuario: "secretaria" }) });
      await expect(serviceSecretaria.registrarJustificativa(localId, { motivo: "Atestado" }, reqSecretaria)).rejects.toMatchObject({ status: 403 });
      const service = criar({ buscarRegistroPorId: async () => null });
      await expect(service.registrarJustificativa(localId, { motivo: "Atestado" }, reqProfessor)).rejects.toMatchObject({ status: 404 });
    });

    it("so permite justificar ausencia", async () => {
      const service = criar({ buscarRegistroPorId: async () => ({ ...registroBase, status: "PRESENTE" }) });
      await expect(service.registrarJustificativa(localId, { motivo: "Atestado" }, reqProfessor)).rejects.toThrow(/só pode ser informada para ausência/);
    });

    it("aluno so pode justificar a propria ausencia", async () => {
      const reqAluno = { user: { id: usuarioId, tipo_usuario: "aluno" } } as any;
      const outroAluno = "99999999-2222-4222-8222-222222222222";
      const service = criar({
        buscarUsuarioPorId: async () => ({ id: usuarioId, tipo_usuario: "aluno" }),
        buscarRegistroPorId: async () => ({ ...registroBase, alunoId: outroAluno }),
      });
      await expect(service.registrarJustificativa(localId, { motivo: "Atestado" }, reqAluno)).rejects.toMatchObject({ status: 403 });
    });

    it("professor sem vinculo com a turma e bloqueado", async () => {
      const service = criar({ buscarRegistroPorId: async () => ({ ...registroBase }), professorPossuiTurma: async () => false });
      await expect(service.registrarJustificativa(localId, { motivo: "Atestado" }, reqProfessor)).rejects.toThrow(/fora da atribuição/);
    });

    it("salva a justificativa quando tudo e valido", async () => {
      let salvo: any;
      const service = criar({
        buscarRegistroPorId: async () => ({ ...registroBase }),
        salvarJustificativa: async (id: string, dados: any) => { salvo = { id, dados }; return { id, ...dados }; },
      });
      const r = await service.registrarJustificativa(localId, { motivo: "Atestado médico" }, reqProfessor);
      expect(salvo.id).toBe(localId);
      expect(salvo.dados.motivo).toBe("Atestado médico");
      expect(r.mensagem).toMatch(/Justificativa salva/);
    });

    it("permite substituir justificativa existente quando confirmado", async () => {
      const service = criar({ buscarRegistroPorId: async () => ({ ...registroBase, motivoJustificativa: "Anterior" }) });
      const r = await service.registrarJustificativa(localId, { motivo: "Novo motivo", confirmarSubstituicao: true }, reqProfessor);
      expect(r.mensagem).toMatch(/Justificativa salva/);
    });
  });

  describe("consultarAluno e minhaFrequencia", () => {
    it("minhaFrequencia bloqueia quem nao e aluno", async () => {
      await expect(criar().minhaFrequencia(reqProfessor)).rejects.toMatchObject({ status: 403 });
    });

    it("minhaFrequencia monta o consolidado do proprio aluno", async () => {
      const service = criar({
        buscarUsuarioPorId: async () => ({ id: usuarioId, tipo_usuario: "aluno" }),
        listarHistoricoAluno: async () => [{ id: "h1", turma_disciplina_id: turmaId, disciplina_id: "d", disciplina_nome: "Disciplina", aluno_nome: "Aluno", status: "PRESENTE", data: "2026-05-01" }],
      });
      const reqAluno = { user: { id: usuarioId, tipo_usuario: "aluno" } } as any;
      const r = await service.minhaFrequencia(reqAluno);
      expect(r.alunoId).toBe(alunoId);
      expect(r.consolidado).toHaveLength(1);
      expect(r.consolidado[0].situacao).toBe("REGULAR");
    });

    it("consultarAluno sem req retorna o consolidado direto", async () => {
      const r = await criar().consultarAluno(alunoId);
      expect(r.alunoId).toBe(alunoId);
    });

    it("consultarAluno rejeita id invalido", async () => {
      await expect(criar().consultarAluno("invalido")).rejects.toMatchObject({ status: 400 });
    });

    it("aluno so pode consultar o proprio historico", async () => {
      const outroAluno = "99999999-2222-4222-8222-222222222222";
      const reqAluno = { user: { id: usuarioId, tipo_usuario: "aluno" } } as any;
      const service = criar({ buscarUsuarioPorId: async () => ({ id: usuarioId, tipo_usuario: "aluno" }) });
      await expect(service.consultarAluno(outroAluno, reqAluno)).rejects.toMatchObject({ status: 403 });
    });

    it("professor sem vinculo com o aluno e bloqueado", async () => {
      const service = criar({ professorPossuiAluno: async () => false });
      await expect(service.consultarAluno(alunoId, reqProfessor)).rejects.toThrow(/fora das atribuições/);
    });

    it("professor com vinculo consulta o historico do aluno", async () => {
      const r = await criar().consultarAluno(alunoId, reqProfessor);
      expect(r.alunoId).toBe(alunoId);
    });
  });

  describe("consultarTurma e gerarRelatorio", () => {
    it("valida intervalo de datas dos filtros", async () => {
      await expect(criar().consultarTurma(turmaId, reqProfessor, { dataInicio: "2026-06-01", dataFim: "2026-05-01" })).rejects.toThrow(/anterior à final/);
    });

    it("rejeita filtro fora do periodo letivo da turma", async () => {
      await expect(criar().consultarTurma(turmaId, reqProfessor, { dataInicio: "2020-01-01" })).rejects.toThrow(/pertencer ao período letivo/);
      await expect(criar().consultarTurma(turmaId, reqProfessor, { dataFim: "2099-01-01" })).rejects.toThrow(/pertencer ao período letivo/);
    });

    it("rejeita turma inexistente", async () => {
      const service = criar({ buscarTurma: async () => null });
      await expect(service.consultarTurma(turmaId, reqProfessor)).rejects.toMatchObject({ status: 404 });
    });

    it("gerarRelatorio exige turmaDisciplinaId", async () => {
      await expect(criar().gerarRelatorio({}, reqProfessor)).rejects.toThrow(/Informe turma e disciplina/);
    });

    it("gerarRelatorio delega para consultarTurma com os filtros informados", async () => {
      const r = await criar().gerarRelatorio({ turmaDisciplinaId: turmaId, dataInicio: "2026-01-01", dataFim: "2026-12-20" }, reqProfessor);
      expect(r.filtros).toEqual({ turmaDisciplinaId: turmaId, dataInicio: "2026-01-01", dataFim: "2026-12-20" });
      expect(r.turmaDisciplinaId).toBe(turmaId);
    });
  });
});
