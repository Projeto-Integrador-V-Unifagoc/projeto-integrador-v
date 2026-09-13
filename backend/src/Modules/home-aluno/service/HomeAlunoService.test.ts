import { describe, it, expect } from "vitest";
import { HomeAlunoService } from "./HomeAlunoService.js";

const usuarioId = "77777777-7777-4777-8777-777777777777";
const alunoId = "22222222-2222-4222-8222-222222222222";
const turmaDisciplinaId = "11111111-1111-4111-8111-111111111111";

const reqAluno = { user: { id: usuarioId, tipo_usuario: "aluno" } } as any;
const reqProfessor = { user: { id: usuarioId, tipo_usuario: "professor" } } as any;
const reqSecretaria = { user: { id: usuarioId, tipo_usuario: "secretaria" } } as any;
const reqSemUser = {} as any;

const disciplinaRow = (over: Record<string, any> = {}) => ({
  turma_disciplina_id: turmaDisciplinaId,
  disciplina_id: "d1",
  disciplina_codigo: "BD2",
  disciplina_nome: "Banco de Dados II",
  carga_horaria: 60,
  turma_sigla: "2026/1",
  professor_nome: "Marcos Antônio dos Santos",
  periodo_id: "pl1",
  periodo_codigo: "2026/1",
  ...over,
});

const tarefaRow = (over: Record<string, any> = {}) => ({
  avaliacao_id: "av1",
  tipo_avaliacao: "TRABALHO",
  descricao_avaliacao: "Trabalho de Pesquisa - Protótipo",
  data_devolucao: "2026-06-27",
  valor: 10,
  disciplina_nome: "Projeto Integrador V",
  turma_disciplina_id: turmaDisciplinaId,
  ...over,
});

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    buscarAlunoPorUsuarioId: async () => ({ id: alunoId }),
    listarDisciplinasDoAluno: async () => [disciplinaRow()],
    listarTarefasDoAluno: async () => [tarefaRow()],
    ...overrides,
  };
  return new HomeAlunoService(repository as any);
}

describe("HomeAlunoService.minhasDisciplinas", () => {
  it("mapeia o contrato e converte carga horária para número", async () => {
    const r = await criar().minhasDisciplinas(reqAluno);
    expect(r.length).toBe(1);
    expect(r[0]).toEqual({
      turmaDisciplinaId,
      disciplinaId: "d1",
      codigo: "BD2",
      nome: "Banco de Dados II",
      turmaSigla: "2026/1",
      professorNome: "Marcos Antônio dos Santos",
      cargaHoraria: 60,
      periodoLetivo: { id: "pl1", codigo: "2026/1" },
    });
    expect(typeof r[0].cargaHoraria).toBe("number");
  });

  it("deriva o aluno do JWT e consulta o repositório pelo id resolvido", async () => {
    let usuarioRecebido: string | undefined;
    let alunoRecebido: string | undefined;
    const service = criar({
      buscarAlunoPorUsuarioId: async (u: string) => { usuarioRecebido = u; return { id: alunoId }; },
      listarDisciplinasDoAluno: async (id: string) => { alunoRecebido = id; return []; },
    });
    await service.minhasDisciplinas(reqAluno);
    expect(usuarioRecebido).toBe(usuarioId);
    expect(alunoRecebido).toBe(alunoId);
  });

  it("retorna lista vazia para aluno sem matrícula ativa no período corrente", async () => {
    const r = await criar({ listarDisciplinasDoAluno: async () => [] }).minhasDisciplinas(reqAluno);
    expect(r).toEqual([]);
  });
});

describe("HomeAlunoService.minhasTarefas", () => {
  it("mapeia o contrato preservando a ordem crescente entregue pelo repositório", async () => {
    const service = criar({
      listarTarefasDoAluno: async () => [
        tarefaRow({ avaliacao_id: "av1", data_devolucao: "2026-06-20" }),
        tarefaRow({ avaliacao_id: "av2", data_devolucao: "2026-06-27" }),
      ],
    });
    const r = await service.minhasTarefas(reqAluno);
    expect(r.map((t) => t.avaliacaoId)).toEqual(["av1", "av2"]);
    expect(r[0].titulo).toBe("Trabalho de Pesquisa - Protótipo");
    expect(r[0].tipo).toBe("TRABALHO");
    expect(r[0].disciplinaNome).toBe("Projeto Integrador V");
    expect(r[0].turmaDisciplinaId).toBe(turmaDisciplinaId);
    expect(r[0].dataVencimento).toBe("2026-06-20");
    expect(r[0].valor).toBe(10);
  });

  it("usa rótulo derivado do tipo quando a descrição é nula ou em branco", async () => {
    const r = await criar({
      listarTarefasDoAluno: async () => [
        tarefaRow({ avaliacao_id: "av1", descricao_avaliacao: null, tipo_avaliacao: "PROVA" }),
        tarefaRow({ avaliacao_id: "av2", descricao_avaliacao: "   ", tipo_avaliacao: "TPI" }),
      ],
    }).minhasTarefas(reqAluno);
    expect(r[0].titulo).toBe("Prova");
    expect(r[1].titulo).toBe("TPI");
  });

  it("usa o proprio tipo como titulo quando nao ha rotulo mapeado", async () => {
    const r = await criar({
      listarTarefasDoAluno: async () => [tarefaRow({ descricao_avaliacao: "", tipo_avaliacao: "OUTRO" })],
    }).minhasTarefas(reqAluno);
    expect(r[0].titulo).toBe("OUTRO");
  });

  it("preserva valor nulo e normaliza data_devolucao Date para ISO (AAAA-MM-DD)", async () => {
    const r = await criar({
      listarTarefasDoAluno: async () => [
        tarefaRow({ valor: null, data_devolucao: new Date("2026-06-27T03:00:00.000Z") }),
      ],
    }).minhasTarefas(reqAluno);
    expect(r[0].valor).toBeNull();
    expect(r[0].dataVencimento).toBe("2026-06-27");
  });
});

describe("HomeAlunoService autorização e isolamento por aluno", () => {
  it("bloqueia perfil não-aluno (professor/secretaria) com 403", async () => {
    await expect(criar().minhasDisciplinas(reqProfessor)).rejects.toMatchObject({ status: 403 });
    await expect(criar().minhasTarefas(reqSecretaria)).rejects.toMatchObject({ status: 403 });
  });

  it("bloqueia usuário autenticado sem vínculo de aluno com 403", async () => {
    const service = criar({ buscarAlunoPorUsuarioId: async () => null });
    await expect(service.minhasDisciplinas(reqAluno)).rejects.toMatchObject({ status: 403 });
    await expect(service.minhasTarefas(reqAluno)).rejects.toMatchObject({ status: 403 });
  });

  it("bloqueia requisição sem identidade autenticada com 403", async () => {
    await expect(criar().minhasDisciplinas(reqSemUser)).rejects.toMatchObject({ status: 403 });
  });
});
