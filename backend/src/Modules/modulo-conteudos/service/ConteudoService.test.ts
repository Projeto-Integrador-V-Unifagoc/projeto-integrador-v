import { describe, expect, it } from "vitest";
import { ConteudoService } from "./ConteudoService";
import type { ContextoConteudo } from "../models/Conteudo";

const ID = {
  cd: "10000000-0000-4000-8000-000000000001",
  curso: "10000000-0000-4000-8000-000000000002",
  topico: "10000000-0000-4000-8000-000000000003",
  pagina: "10000000-0000-4000-8000-000000000004",
  pagina2: "10000000-0000-4000-8000-000000000005",
  profA: "20000000-0000-4000-8000-00000000000a",
  profB: "20000000-0000-4000-8000-00000000000b",
  arquivo: "30000000-0000-4000-8000-000000000001",
};

const gestor: ContextoConteudo = { usuarioId: "u-sec", perfil: "gestor" };
const profA: ContextoConteudo = { usuarioId: "u-a", perfil: "professor", professorId: ID.profA };
const profB: ContextoConteudo = { usuarioId: "u-b", perfil: "professor", professorId: ID.profB };

// trx falso: aceita `trx("tabela").where(...).update(...)` e registra as atualizações.
function criarTrx(registro: any[]) {
  const trx: any = (tabela: string) => {
    const chain: any = {
      where: (filtro: any) => ({ update: async (dados: any) => (registro.push({ tabela, filtro, dados }), 1) }),
    };
    return chain;
  };
  return trx;
}

function criarRepo(overrides: Record<string, any> = {}) {
  const atualizacoes: any[] = [];
  const estado = {
    responsavel: ID.profA as string | null,
    vinculados: [ID.profA, ID.profB],
    totalTopicos: 1,
    totalPaginas: 1,
    paginasVisiveis: 1,
  };
  const repo: Record<string, any> = {
    estado,
    atualizacoes,
    transacao: async (fn: any) => fn(criarTrx(atualizacoes)),
    buscarCursoDisciplina: async () => ({
      id: ID.cd,
      carga_horaria: 40, // recomendado 10 tópicos, máximo 20
      curso_id: ID.curso,
      curso_nome: "ADS",
      curso_codigo: "ADS",
      disciplina_id: "d1",
      disciplina_nome: "Algoritmos",
      disciplina_codigo: "ALG",
    }),
    buscarPosse: async () =>
      estado.responsavel ? { responsavel_professor_id: estado.responsavel, responsavel_nome: "Prof A" } : { responsavel_professor_id: null },
    professorVinculado: async (professorId: string) => estado.vinculados.includes(professorId),
    professorAtivoVinculado: async (professorId: string) => estado.vinculados.includes(professorId),
    contarTopicos: async () => estado.totalTopicos,
    contarPaginas: async () => estado.totalPaginas,
    contarPaginasVisiveis: async () => estado.paginasVisiveis,
    criarPosseSeAusente: async () => {},
    definirResponsavel: async (_cd: string, professorId: string) => {
      estado.responsavel = professorId;
    },
    proximaOrdemDeTopico: async () => 2,
    proximaOrdemDePagina: async () => 2,
    criarTopico: async (dados: any) => ({ id: ID.topico, publicado: false, ...dados }),
    atualizarTopico: async (_id: string, dados: any) => ({ id: ID.topico, titulo: "T", ordem: 1, ...dados }),
    tocarTopico: async () => {},
    buscarTopico: async () => ({ id: ID.topico, curso_disciplina_id: ID.cd, titulo: "T", publicado: false, ordem: 1 }),
    listarTopicos: async () => [{ id: ID.topico, titulo: "T", ordem: 1, publicado: false }],
    listarPaginasDaDisciplina: async () => [{ id: ID.pagina, topico_id: ID.topico, ordem: 1, oculta: false, versao: 1 }],
    listarPaginasDoTopico: async () => [],
    listarProfessoresVinculados: async () => [],
    buscarPagina: async () => ({
      id: ID.pagina,
      topico_id: ID.topico,
      curso_disciplina_id: ID.cd,
      ordem: 1,
      versao: 3,
      oculta: false,
      blocos: [],
      minutos_estimados: 0,
      videos: 0,
      imagens: 0,
    }),
    salvarBlocosSeVersao: async (_id: string, _versao: number, dados: any) => ({ id: ID.pagina, ...dados }),
    contarArquivosDaDisciplina: async (ids: string[]) => ids.length,
    atualizarPagina: async () => ({}),
    ...overrides,
  };
  return repo;
}

const servico = (repo: Record<string, any>) => new ConteudoService(repo as any);

describe("ConteudoService — acesso", () => {
  it("professor responsável lê o conteúdo", async () => {
    const detalhe = await servico(criarRepo()).detalhar(profA, ID.cd);
    expect(detalhe.topicos).toHaveLength(1);
    expect(detalhe.podeTransferir).toBe(false);
  });

  it("outro professor vinculado não vê o conteúdo (403)", async () => {
    await expect(servico(criarRepo()).detalhar(profB, ID.cd)).rejects.toMatchObject({ status: 403 });
    await expect(servico(criarRepo()).obterPagina(profB, ID.pagina)).rejects.toMatchObject({ status: 403 });
  });

  it("professor sem vínculo com a disciplina no curso recebe 403", async () => {
    const repo = criarRepo();
    repo.estado.vinculados = [ID.profA];
    await expect(servico(repo).detalhar(profB, ID.cd)).rejects.toThrow(/não está vinculado/);
  });

  it("disciplina disponível (sem responsável e sem tópicos) abre vazia para o professor vinculado", async () => {
    const repo = criarRepo({ listarTopicos: async () => [], listarPaginasDaDisciplina: async () => [] });
    repo.estado.responsavel = null;
    repo.estado.totalTopicos = 0;
    const detalhe = await servico(repo).detalhar(profB, ID.cd);
    expect(detalhe.responsavel).toBeNull();
  });

  it("sem responsável mas com conteúdo da secretaria: professor aguarda designação", async () => {
    const repo = criarRepo();
    repo.estado.responsavel = null;
    await expect(servico(repo).detalhar(profA, ID.cd)).rejects.toThrow(/aguardando a secretaria/);
  });

  it("gestor acessa qualquer disciplina", async () => {
    const detalhe = await servico(criarRepo()).detalhar(gestor, ID.cd);
    expect(detalhe.podeTransferir).toBe(true);
  });
});

describe("ConteudoService — posse e tópicos", () => {
  it("o primeiro tópico do professor vinculado assume a responsabilidade", async () => {
    const repo = criarRepo();
    repo.estado.responsavel = null;
    repo.estado.totalTopicos = 0;
    const r = await servico(repo).criarTopico(profB, ID.cd, { titulo: "  Estudo   Dirigido 1 " });
    expect(r.assumiuResponsabilidade).toBe(true);
    expect(repo.estado.responsavel).toBe(ID.profB);
    expect(r.topico.titulo).toBe("Estudo Dirigido 1");
  });

  it("não deixa criar tópico em disciplina de outro professor", async () => {
    await expect(servico(criarRepo()).criarTopico(profB, ID.cd, { titulo: "X" })).rejects.toMatchObject({ status: 403 });
  });

  it("não deixa o professor assumir conteúdo criado pela secretaria sem responsável", async () => {
    const repo = criarRepo();
    repo.estado.responsavel = null;
    await expect(servico(repo).criarTopico(profB, ID.cd, { titulo: "X" })).rejects.toThrow(/aguardando a secretaria/);
  });

  it("secretaria cria tópico sem virar responsável", async () => {
    const repo = criarRepo();
    repo.estado.responsavel = null;
    const r = await servico(repo).criarTopico(gestor, ID.cd, { titulo: "X" });
    expect(r.assumiuResponsabilidade).toBe(false);
    expect(repo.estado.responsavel).toBeNull();
  });

  it("bloqueia no máximo de tópicos e avisa acima do recomendado", async () => {
    const repo = criarRepo();
    repo.estado.totalTopicos = 20;
    await expect(servico(repo).criarTopico(profA, ID.cd, { titulo: "X" })).rejects.toMatchObject({ status: 422 });
    repo.estado.totalTopicos = 10;
    const r = await servico(repo).criarTopico(profA, ID.cd, { titulo: "X" });
    expect(r.avisos[0]).toMatch(/recomendado de tópicos \(10\)/);
  });

  it("exige nome do tópico", async () => {
    await expect(servico(criarRepo()).criarTopico(profA, ID.cd, { titulo: "   " })).rejects.toMatchObject({ status: 400 });
  });

  it("só publica tópico com página visível", async () => {
    const repo = criarRepo();
    repo.estado.paginasVisiveis = 0;
    await expect(servico(repo).definirPublicacao(profA, ID.topico, true)).rejects.toMatchObject({ status: 422 });
    repo.estado.paginasVisiveis = 1;
    const topico = await servico(repo).definirPublicacao(profA, ID.topico, true);
    expect(topico.publicado).toBe(true);
  });
});

describe("ConteudoService — transferência", () => {
  it("só a secretaria transfere", async () => {
    await expect(servico(criarRepo()).transferirResponsavel(profA, ID.cd, ID.profB)).rejects.toMatchObject({ status: 403 });
  });

  it("transfere para professor ativo vinculado", async () => {
    const repo = criarRepo();
    await servico(repo).transferirResponsavel(gestor, ID.cd, ID.profB);
    expect(repo.estado.responsavel).toBe(ID.profB);
  });

  it("recusa professor não vinculado", async () => {
    const repo = criarRepo();
    repo.estado.vinculados = [ID.profA];
    await expect(servico(repo).transferirResponsavel(gestor, ID.cd, ID.profB)).rejects.toMatchObject({ status: 400 });
  });
});

describe("ConteudoService — páginas", () => {
  const blocos = [{ type: "paragraph", content: [{ type: "text", text: "olá mundo", styles: {} }] }];

  it("salva o documento com métricas calculadas no servidor", async () => {
    let gravado: any;
    const repo = criarRepo({
      salvarBlocosSeVersao: async (_id: string, versao: number, dados: any) => ((gravado = { versao, ...dados }), { id: ID.pagina }),
    });
    await servico(repo).salvarBlocos(profA, ID.pagina, { blocos, versao: 3 });
    expect(gravado).toMatchObject({ versao: 3, palavras: 2, atualizado_por_usuario_id: "u-a" });
  });

  it("devolve 409 quando a versão mudou", async () => {
    const repo = criarRepo({ salvarBlocosSeVersao: async () => null });
    await expect(servico(repo).salvarBlocos(profA, ID.pagina, { blocos, versao: 2 })).rejects.toMatchObject({
      status: 409,
      codigo: "VERSAO_DESATUALIZADA",
    });
  });

  it("recusa arquivo de outra disciplina", async () => {
    const repo = criarRepo({ contarArquivosDaDisciplina: async () => 0 });
    const comImagem = [{ type: "image", props: { url: `conteudo-arquivo:${ID.arquivo}` } }];
    await expect(servico(repo).salvarBlocos(profA, ID.pagina, { blocos: comImagem, versao: 3 })).rejects.toThrow(/não pertencem/);
  });

  it("bloqueia página que passa do limite e permite salvar enquanto reduz", async () => {
    const quatroVideos = Array.from({ length: 4 }, () => ({ type: "videoEmbed", props: { url: "https://youtu.be/x" } }));
    await expect(servico(criarRepo()).salvarBlocos(profA, ID.pagina, { blocos: quatroVideos, versao: 3 })).rejects.toMatchObject({
      status: 422,
    });
    const jaAcima = criarRepo({
      buscarPagina: async () => ({ id: ID.pagina, topico_id: ID.topico, curso_disciplina_id: ID.cd, versao: 3, videos: 5, imagens: 0, minutos_estimados: 5 }),
    });
    const r = await servico(jaAcima).salvarBlocos(profA, ID.pagina, { blocos: quatroVideos, versao: 3 });
    expect(r.avisos.join(" ")).toMatch(/no máximo 3 vídeos/);
  });

  it("não deixa ocultar a última página visível de um tópico publicado", async () => {
    const repo = criarRepo({
      buscarTopico: async () => ({ id: ID.topico, curso_disciplina_id: ID.cd, publicado: true }),
    });
    repo.estado.paginasVisiveis = 0;
    await expect(servico(repo).atualizarPagina(profA, ID.pagina, { oculta: true })).rejects.toMatchObject({ status: 422 });
  });

  it("bloqueia nova página no máximo do tópico", async () => {
    const repo = criarRepo();
    repo.estado.totalPaginas = 20;
    await expect(servico(repo).criarPagina(profA, ID.topico, {})).rejects.toMatchObject({ status: 422 });
  });
});

describe("ConteudoService — ordem", () => {
  it("recusa árvore que não corresponde à atual", async () => {
    await expect(
      servico(criarRepo()).reordenar(profA, ID.cd, { topicos: [{ id: ID.topico, paginas: [] }] }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("recusa deixar tópico publicado sem página visível", async () => {
    const repo = criarRepo({
      listarTopicos: async () => [
        { id: ID.topico, ordem: 1, publicado: true },
        { id: "t2", ordem: 2, publicado: false },
      ],
    });
    await expect(
      servico(repo).reordenar(profA, ID.cd, { topicos: [{ id: ID.topico, paginas: [] }, { id: "t2", paginas: [ID.pagina] }] }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("move página entre tópicos e grava a nova ordem", async () => {
    const repo = criarRepo({
      listarTopicos: async () => [
        { id: ID.topico, ordem: 1, publicado: false },
        { id: "t2", ordem: 2, publicado: false },
      ],
      listarPaginasDaDisciplina: async () => [
        { id: ID.pagina, topico_id: ID.topico, ordem: 1, oculta: false },
        { id: ID.pagina2, topico_id: ID.topico, ordem: 2, oculta: false },
      ],
    });
    await servico(repo).reordenar(profA, ID.cd, {
      topicos: [
        { id: "t2", paginas: [ID.pagina2] },
        { id: ID.topico, paginas: [ID.pagina] },
      ],
    });
    expect(repo.atualizacoes).toContainEqual({ tabela: "piv.conteudo_topico", filtro: { id: "t2" }, dados: { ordem: 1 } });
    expect(repo.atualizacoes).toContainEqual({
      tabela: "piv.conteudo_pagina",
      filtro: { id: ID.pagina2 },
      dados: { topico_id: "t2", ordem: 1 },
    });
  });
});

describe("ConteudoService — lista de disciplinas", () => {
  it("professor não vê totais nem responsável da disciplina de outro professor", async () => {
    const repo = criarRepo({
      buscarCurso: async () => ({ id: ID.curso, nome: "ADS" }),
      listarDisciplinasDoCurso: async () => [
        { id: "cd-minha", responsavel_professor_id: ID.profA, total_topicos: 3, carga_horaria: 40 },
        { id: "cd-livre", responsavel_professor_id: null, total_topicos: 0, carga_horaria: 40 },
        { id: "cd-outro", responsavel_professor_id: ID.profB, responsavel_nome: "Prof B", total_topicos: 5, carga_horaria: 40 },
      ],
    });
    const { disciplinas } = await servico(repo).listarDisciplinas(profA, ID.curso);
    expect(disciplinas.map((d: any) => d.situacao)).toEqual(["minha", "disponivel", "de_outro_professor"]);
    expect(disciplinas[2]).toMatchObject({ totalTopicos: null, responsavel: null });
  });
});

describe("ConteudoService — leitura do aluno", () => {
  const aluno: ContextoConteudo = { usuarioId: "u-al", perfil: "aluno", alunoId: "al1" };

  it("mostra só tópicos publicados e páginas visíveis da oferta do aluno", async () => {
    const repo = criarRepo({
      buscarOfertaDoAluno: async () => ({ curso_disciplina_id: ID.cd, disciplina_nome: "Algoritmos", turma_sigla: "ADS1A" }),
      listarTopicos: async () => [
        { id: "t1", titulo: "Publicado", publicado: true },
        { id: "t2", titulo: "Rascunho", publicado: false },
        { id: "t3", titulo: "Publicado sem página visível", publicado: true },
      ],
      listarPaginasDaDisciplina: async () => [
        { id: "p1", topico_id: "t1", oculta: false },
        { id: "p2", topico_id: "t1", oculta: true },
        { id: "p3", topico_id: "t2", oculta: false },
        { id: "p4", topico_id: "t3", oculta: true },
      ],
    });
    const r = await servico(repo).conteudoDoAluno(aluno, ID.topico);
    expect(r.topicos.map((t: any) => t.id)).toEqual(["t1"]);
    expect(r.topicos[0].paginas.map((p: any) => p.id)).toEqual(["p1"]);
  });

  it("recusa oferta em que o aluno não está matriculado", async () => {
    const repo = criarRepo({ buscarOfertaDoAluno: async () => undefined });
    await expect(servico(repo).conteudoDoAluno(aluno, ID.topico)).rejects.toMatchObject({ status: 403 });
  });

  it("não entrega página oculta, de tópico em rascunho ou de disciplina alheia", async () => {
    const pagina = { id: ID.pagina, curso_disciplina_id: ID.cd, topico_publicado: true, oculta: false, blocos: [] };
    const ok = criarRepo({ buscarPagina: async () => pagina, alunoAcessaCursoDisciplina: async () => true });
    expect((await servico(ok).paginaPublicada(aluno, ID.pagina)).id).toBe(ID.pagina);

    const oculta = criarRepo({ buscarPagina: async () => ({ ...pagina, oculta: true }), alunoAcessaCursoDisciplina: async () => true });
    await expect(servico(oculta).paginaPublicada(aluno, ID.pagina)).rejects.toMatchObject({ status: 404 });

    const rascunho = criarRepo({ buscarPagina: async () => ({ ...pagina, topico_publicado: false }), alunoAcessaCursoDisciplina: async () => true });
    await expect(servico(rascunho).paginaPublicada(aluno, ID.pagina)).rejects.toMatchObject({ status: 404 });

    const alheia = criarRepo({ buscarPagina: async () => pagina, alunoAcessaCursoDisciplina: async () => false });
    await expect(servico(alheia).paginaPublicada(aluno, ID.pagina)).rejects.toMatchObject({ status: 403 });
  });

  it("aluno não acessa o cadastro (rotas de edição usam o acesso de professor)", async () => {
    await expect(servico(criarRepo()).detalhar(aluno, ID.cd)).rejects.toMatchObject({ status: 403 });
  });
});
