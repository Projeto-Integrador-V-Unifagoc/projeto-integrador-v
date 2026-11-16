import type { Knex } from "knex";
import { erroConteudo } from "../errors/ConteudoError";
import type {
  ArquivoEnviado,
  AtualizarPaginaRequest,
  AtualizarTopicoRequest,
  ContextoConteudo,
  CriarTopicoRequest,
  DividirPaginaRequest,
  OrdemRequest,
  SalvarBlocosRequest,
  SituacaoPosse,
} from "../models/Conteudo";
import { ConteudoRepository } from "../repository/ConteudoRepository";
import { avaliarLimitesDaPagina, PREFIXO_ARQUIVO, validarEMedirBlocos, type MetricasPagina } from "./ConteudoBlocos";
import { LIMITES_CONTEUDO, limitesDaDisciplina, limitesDeTopicos } from "./conteudoLimites";

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

type Modo = "ler" | "editar";

function uuid(valor: unknown, mensagem: string): string {
  if (typeof valor !== "string" || !UUID.test(valor)) throw erroConteudo.invalido(mensagem);
  return valor;
}

function textoObrigatorio(valor: unknown, campo: string, maximo: number) {
  const texto = typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
  if (!texto) throw erroConteudo.invalido(`Informe o ${campo}.`);
  if (texto.length > maximo) throw erroConteudo.invalido(`O ${campo} deve ter no máximo ${maximo} caracteres.`);
  return texto;
}

function textoOpcional(valor: unknown, campo: string, maximo: number) {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor !== "string") throw erroConteudo.invalido(`${campo} inválido.`);
  const texto = valor.trim();
  if (texto.length > maximo) throw erroConteudo.invalido(`${campo} deve ter no máximo ${maximo} caracteres.`);
  return texto || null;
}

function copia(titulo: string | null, maximo: number) {
  if (!titulo) return null;
  const sufixo = " (cópia)";
  return `${titulo.slice(0, maximo - sufixo.length)}${sufixo}`;
}

function metricasDaLinha(linha: any): MetricasPagina {
  return {
    palavras: Number(linha.palavras ?? 0),
    imagens: Number(linha.imagens ?? 0),
    videos: Number(linha.videos ?? 0),
    arquivos: Number(linha.arquivos ?? 0),
    links: Number(linha.links ?? 0),
    minutosEstimados: Number(linha.minutos_estimados ?? 0),
  };
}

function colunasDeMetricas(m: MetricasPagina) {
  return {
    palavras: m.palavras,
    imagens: m.imagens,
    videos: m.videos,
    arquivos: m.arquivos,
    links: m.links,
    minutos_estimados: m.minutosEstimados,
  };
}

function resumoPagina(p: any) {
  return {
    id: p.id,
    topicoId: p.topico_id,
    titulo: p.titulo ?? null,
    ordem: Number(p.ordem),
    oculta: Boolean(p.oculta),
    versao: Number(p.versao),
    metricas: metricasDaLinha(p),
    atualizadoEm: p.updated_at ?? null,
    atualizadoPorNome: p.atualizado_por_nome ?? null,
  };
}

function paginaCompleta(p: any) {
  return {
    ...resumoPagina(p),
    blocos: Array.isArray(p.blocos) ? p.blocos : [],
    topico: { id: p.topico_id, titulo: p.topico_titulo, publicado: Boolean(p.topico_publicado) },
    cursoDisciplinaId: p.curso_disciplina_id,
  };
}

function resumoTopico(t: any, paginas: any[]) {
  return {
    id: t.id,
    titulo: t.titulo,
    descricao: t.descricao ?? null,
    ordem: Number(t.ordem),
    publicado: Boolean(t.publicado),
    publicadoEm: t.publicado_em ?? null,
    atualizadoEm: t.updated_at ?? null,
    atualizadoPorNome: t.atualizado_por_nome ?? null,
    paginas: paginas.map(resumoPagina),
  };
}

/**
 * Regras do cadastro de conteúdo acadêmico (Tópico → Página → blocos).
 *
 * O conteúdo pertence à disciplina dentro do curso (`curso_disciplina`) e tem
 * um professor responsável, o único professor que lê e edita. Secretaria e
 * administrador ("gestor") editam tudo e transferem o responsável. Um
 * professor vinculado assume a disciplina ao criar o primeiro tópico, desde
 * que ela ainda não tenha responsável nem conteúdo.
 */
export class ConteudoService {
  constructor(private repository = new ConteudoRepository()) {}

  // ---------- permissão ----------

  private async acessar(ctx: ContextoConteudo, cursoDisciplinaId: string, modo: Modo, executor?: Knex.Transaction) {
    const cursoDisciplina = await this.repository.buscarCursoDisciplina(cursoDisciplinaId, executor);
    if (!cursoDisciplina) throw erroConteudo.naoEncontrado("Disciplina não encontrada neste curso.");
    const posse = await this.repository.buscarPosse(cursoDisciplinaId, executor);
    if (ctx.perfil === "gestor") return { cursoDisciplina, posse };

    if (!ctx.professorId || !(await this.repository.professorVinculado(ctx.professorId, cursoDisciplinaId, executor))) {
      throw erroConteudo.proibido("Você não está vinculado a esta disciplina neste curso.");
    }
    const responsavel = posse?.responsavel_professor_id ?? null;
    if (responsavel === ctx.professorId) return { cursoDisciplina, posse };
    if (!responsavel && modo === "ler" && (await this.repository.contarTopicos(cursoDisciplinaId, executor)) === 0) {
      // Disponível: o professor pode abrir a tela vazia e assumir criando o 1º tópico.
      return { cursoDisciplina, posse };
    }
    throw erroConteudo.proibido(
      responsavel
        ? "O conteúdo desta disciplina está sob responsabilidade de outro professor."
        : "O conteúdo desta disciplina está aguardando a secretaria designar um responsável.",
    );
  }

  private async topicoComAcesso(ctx: ContextoConteudo, topicoId: string, modo: Modo, executor?: Knex.Transaction) {
    uuid(topicoId, "Tópico inválido.");
    const topico = await this.repository.buscarTopico(topicoId, executor);
    if (!topico) throw erroConteudo.naoEncontrado("Tópico não encontrado.");
    const acesso = await this.acessar(ctx, topico.curso_disciplina_id, modo, executor);
    return { topico, ...acesso };
  }

  private async paginaComAcesso(ctx: ContextoConteudo, paginaId: string, modo: Modo, executor?: Knex.Transaction) {
    uuid(paginaId, "Página inválida.");
    const pagina = await this.repository.buscarPagina(paginaId, executor);
    if (!pagina) throw erroConteudo.naoEncontrado("Página não encontrada.");
    const acesso = await this.acessar(ctx, pagina.curso_disciplina_id, modo, executor);
    return { pagina, ...acesso };
  }

  // Um tópico publicado precisa manter ao menos uma página visível.
  private async garantirPaginaVisivel(topicoId: string, executor?: Knex.Transaction) {
    const topico = await this.repository.buscarTopico(topicoId, executor);
    if (!topico?.publicado) return;
    if ((await this.repository.contarPaginasVisiveis(topicoId, executor)) === 0) {
      throw erroConteudo.limite(
        "Um tópico publicado precisa de ao menos uma página visível. Despublique o tópico antes ou mantenha outra página visível.",
      );
    }
  }

  // ---------- navegação ----------

  async listarCursos(ctx: ContextoConteudo) {
    const cursos = await this.repository.listarCursos(ctx.perfil === "professor" ? ctx.professorId : undefined);
    return cursos.map((c: any) => ({
      id: c.id,
      nome: c.nome,
      codigo: c.codigo,
      totalDisciplinas: Number(c.total_disciplinas ?? 0),
    }));
  }

  async listarDisciplinas(ctx: ContextoConteudo, cursoId: string) {
    uuid(cursoId, "Curso inválido.");
    const curso = await this.repository.buscarCurso(cursoId);
    if (!curso) throw erroConteudo.naoEncontrado("Curso não encontrado.");
    const ehProfessor = ctx.perfil === "professor";
    const linhas = await this.repository.listarDisciplinasDoCurso(cursoId, ehProfessor ? ctx.professorId : undefined);

    const disciplinas = linhas.map((l: any) => {
      const base = {
        cursoDisciplinaId: l.id,
        disciplina: { id: l.disciplina_id, nome: l.disciplina_nome, codigo: l.disciplina_codigo },
        cargaHoraria: Number(l.carga_horaria),
        periodoIdeal: l.periodo_ideal ?? null,
      };
      const totais = {
        totalTopicos: Number(l.total_topicos ?? 0),
        totalPublicados: Number(l.total_publicados ?? 0),
      };
      if (!ehProfessor) {
        return {
          ...base,
          ...totais,
          situacao: null,
          totalProfessores: Number(l.total_professores ?? 0),
          responsavel: l.responsavel_professor_id ? { id: l.responsavel_professor_id, nome: l.responsavel_nome } : null,
        };
      }
      let situacao: SituacaoPosse;
      if (l.responsavel_professor_id === ctx.professorId) situacao = "minha";
      else if (!l.responsavel_professor_id && totais.totalTopicos === 0) situacao = "disponivel";
      else situacao = "de_outro_professor";
      // O professor que não é responsável não vê nada do conteúdo alheio.
      return situacao === "de_outro_professor"
        ? { ...base, situacao, totalTopicos: null, totalPublicados: null, totalProfessores: null, responsavel: null }
        : { ...base, ...totais, situacao, totalProfessores: null, responsavel: null };
    });

    return { curso, disciplinas };
  }

  async detalhar(ctx: ContextoConteudo, cursoDisciplinaId: string) {
    uuid(cursoDisciplinaId, "Disciplina inválida.");
    const { cursoDisciplina: cd, posse } = await this.acessar(ctx, cursoDisciplinaId, "ler");
    const [topicos, paginas, professores] = await Promise.all([
      this.repository.listarTopicos(cursoDisciplinaId),
      this.repository.listarPaginasDaDisciplina(cursoDisciplinaId),
      ctx.perfil === "gestor" ? this.repository.listarProfessoresVinculados(cursoDisciplinaId) : Promise.resolve([]),
    ]);
    const porTopico = new Map<string, any[]>();
    for (const pagina of paginas) porTopico.set(pagina.topico_id, [...(porTopico.get(pagina.topico_id) ?? []), pagina]);

    return {
      cursoDisciplinaId,
      curso: { id: cd.curso_id, nome: cd.curso_nome, codigo: cd.curso_codigo },
      disciplina: { id: cd.disciplina_id, nome: cd.disciplina_nome, codigo: cd.disciplina_codigo },
      cargaHoraria: Number(cd.carga_horaria),
      perfil: ctx.perfil,
      responsavel: posse?.responsavel_professor_id
        ? { id: posse.responsavel_professor_id, nome: posse.responsavel_nome }
        : null,
      podeTransferir: ctx.perfil === "gestor",
      professoresVinculados: professores.map((p: any) => ({ id: p.id, nome: p.nome, ativo: Boolean(p.ativo) })),
      limites: limitesDaDisciplina(Number(cd.carga_horaria)),
      topicos: topicos.map((t: any) => resumoTopico(t, porTopico.get(t.id) ?? [])),
    };
  }

  async transferirResponsavel(ctx: ContextoConteudo, cursoDisciplinaId: string, professorId: unknown) {
    if (ctx.perfil !== "gestor") throw erroConteudo.proibido("Apenas a secretaria transfere o responsável pelo conteúdo.");
    uuid(cursoDisciplinaId, "Disciplina inválida.");
    const novoResponsavel = uuid(professorId, "Professor inválido.");
    const cd = await this.repository.buscarCursoDisciplina(cursoDisciplinaId);
    if (!cd) throw erroConteudo.naoEncontrado("Disciplina não encontrada neste curso.");
    if (!(await this.repository.professorAtivoVinculado(novoResponsavel, cursoDisciplinaId))) {
      throw erroConteudo.invalido("O novo responsável precisa ser um professor ativo vinculado a esta disciplina neste curso.");
    }
    await this.repository.transacao(async (trx) => {
      await this.repository.criarPosseSeAusente(cursoDisciplinaId, null, trx);
      await this.repository.definirResponsavel(cursoDisciplinaId, novoResponsavel, ctx.usuarioId, trx);
    });
    return this.detalhar(ctx, cursoDisciplinaId);
  }

  // ---------- tópicos ----------

  async criarTopico(ctx: ContextoConteudo, cursoDisciplinaId: string, payload: CriarTopicoRequest) {
    uuid(cursoDisciplinaId, "Disciplina inválida.");
    const titulo = textoObrigatorio(payload?.titulo, "nome do tópico", LIMITES_CONTEUDO.tamanhoMaximoTitulo);
    const descricao = textoOpcional(payload?.descricao, "A descrição", LIMITES_CONTEUDO.tamanhoMaximoDescricao) ?? null;

    return this.repository.transacao(async (trx) => {
      const cd = await this.repository.buscarCursoDisciplina(cursoDisciplinaId, trx);
      if (!cd) throw erroConteudo.naoEncontrado("Disciplina não encontrada neste curso.");
      let assumiuResponsabilidade = false;

      if (ctx.perfil === "professor") {
        if (!ctx.professorId || !(await this.repository.professorVinculado(ctx.professorId, cursoDisciplinaId, trx))) {
          throw erroConteudo.proibido("Você não está vinculado a esta disciplina neste curso.");
        }
        // A linha de posse serializa dois professores tentando assumir ao mesmo tempo.
        await this.repository.criarPosseSeAusente(cursoDisciplinaId, null, trx);
        const posse = await this.repository.buscarPosse(cursoDisciplinaId, trx, true);
        if (posse?.responsavel_professor_id !== ctx.professorId) {
          if (posse?.responsavel_professor_id) {
            throw erroConteudo.proibido("O conteúdo desta disciplina está sob responsabilidade de outro professor.");
          }
          if ((await this.repository.contarTopicos(cursoDisciplinaId, trx)) > 0) {
            throw erroConteudo.proibido("O conteúdo desta disciplina está aguardando a secretaria designar um responsável.");
          }
          await this.repository.definirResponsavel(cursoDisciplinaId, ctx.professorId, null, trx);
          assumiuResponsabilidade = true;
        }
      }

      const limites = limitesDeTopicos(Number(cd.carga_horaria));
      const total = await this.repository.contarTopicos(cursoDisciplinaId, trx);
      if (total >= limites.maximo) {
        throw erroConteudo.limite(`Esta disciplina já atingiu o máximo de ${limites.maximo} tópicos.`);
      }
      const topico = await this.repository.criarTopico(
        {
          curso_disciplina_id: cursoDisciplinaId,
          titulo,
          descricao,
          ordem: await this.repository.proximaOrdemDeTopico(cursoDisciplinaId, trx),
          criado_por_usuario_id: ctx.usuarioId,
          atualizado_por_usuario_id: ctx.usuarioId,
        },
        trx,
      );
      const avisos = total + 1 > limites.recomendado
        ? [`A disciplina passou do número recomendado de tópicos (${limites.recomendado}).`]
        : [];
      return { topico: resumoTopico(topico, []), assumiuResponsabilidade, avisos };
    });
  }

  async atualizarTopico(ctx: ContextoConteudo, topicoId: string, payload: AtualizarTopicoRequest) {
    await this.topicoComAcesso(ctx, topicoId, "editar");
    const dados: Record<string, unknown> = { atualizado_por_usuario_id: ctx.usuarioId };
    if (payload?.titulo !== undefined) {
      dados.titulo = textoObrigatorio(payload.titulo, "nome do tópico", LIMITES_CONTEUDO.tamanhoMaximoTitulo);
    }
    const descricao = textoOpcional(payload?.descricao, "A descrição", LIMITES_CONTEUDO.tamanhoMaximoDescricao);
    if (descricao !== undefined) dados.descricao = descricao;
    if (Object.keys(dados).length === 1) throw erroConteudo.invalido("Nenhum campo enviado para atualização.");
    const topico = await this.repository.atualizarTopico(topicoId, dados);
    return resumoTopico(topico, await this.repository.listarPaginasDoTopico(topicoId));
  }

  async definirPublicacao(ctx: ContextoConteudo, topicoId: string, publicado: boolean) {
    await this.topicoComAcesso(ctx, topicoId, "editar");
    if (publicado && (await this.repository.contarPaginasVisiveis(topicoId)) === 0) {
      throw erroConteudo.limite("Adicione ao menos uma página visível antes de publicar o tópico.");
    }
    const topico = await this.repository.atualizarTopico(topicoId, {
      publicado,
      publicado_em: publicado ? new Date() : null,
      publicado_por_usuario_id: publicado ? ctx.usuarioId : null,
      atualizado_por_usuario_id: ctx.usuarioId,
    });
    return resumoTopico(topico, await this.repository.listarPaginasDoTopico(topicoId));
  }

  async duplicarTopico(ctx: ContextoConteudo, topicoId: string) {
    return this.repository.transacao(async (trx) => {
      const { topico, cursoDisciplina } = await this.topicoComAcesso(ctx, topicoId, "editar", trx);
      const limites = limitesDeTopicos(Number(cursoDisciplina.carga_horaria));
      if ((await this.repository.contarTopicos(topico.curso_disciplina_id, trx)) >= limites.maximo) {
        throw erroConteudo.limite(`Esta disciplina já atingiu o máximo de ${limites.maximo} tópicos.`);
      }
      const novo = await this.repository.criarTopico(
        {
          curso_disciplina_id: topico.curso_disciplina_id,
          titulo: copia(topico.titulo, LIMITES_CONTEUDO.tamanhoMaximoTitulo),
          descricao: topico.descricao,
          ordem: await this.repository.proximaOrdemDeTopico(topico.curso_disciplina_id, trx),
          criado_por_usuario_id: ctx.usuarioId,
          atualizado_por_usuario_id: ctx.usuarioId,
        },
        trx,
      );
      const paginas = await this.repository.listarPaginasDoTopico(topicoId, trx);
      const copias = [];
      for (const pagina of paginas) {
        copias.push(
          await this.repository.criarPagina(
            {
              topico_id: novo.id,
              titulo: pagina.titulo,
              ordem: pagina.ordem,
              oculta: pagina.oculta,
              blocos: JSON.stringify(pagina.blocos ?? []),
              ...colunasDeMetricas(metricasDaLinha(pagina)),
              criado_por_usuario_id: ctx.usuarioId,
              atualizado_por_usuario_id: ctx.usuarioId,
            },
            trx,
          ),
        );
      }
      return resumoTopico(novo, copias);
    });
  }

  async excluirTopico(ctx: ContextoConteudo, topicoId: string) {
    await this.topicoComAcesso(ctx, topicoId, "editar");
    await this.repository.excluirTopico(topicoId);
  }

  // ---------- páginas ----------

  async criarPagina(ctx: ContextoConteudo, topicoId: string, payload: { titulo?: string | null } = {}) {
    const titulo = textoOpcional(payload?.titulo, "O título", LIMITES_CONTEUDO.tamanhoMaximoTitulo) ?? null;
    return this.repository.transacao(async (trx) => {
      await this.topicoComAcesso(ctx, topicoId, "editar", trx);
      const total = await this.repository.contarPaginas(topicoId, trx);
      if (total >= LIMITES_CONTEUDO.paginasPorTopicoMaximo) {
        throw erroConteudo.limite(`Este tópico já atingiu o máximo de ${LIMITES_CONTEUDO.paginasPorTopicoMaximo} páginas.`);
      }
      const pagina = await this.repository.criarPagina(
        {
          topico_id: topicoId,
          titulo,
          ordem: await this.repository.proximaOrdemDePagina(topicoId, trx),
          blocos: JSON.stringify([]),
          criado_por_usuario_id: ctx.usuarioId,
          atualizado_por_usuario_id: ctx.usuarioId,
        },
        trx,
      );
      await this.repository.tocarTopico(topicoId, ctx.usuarioId, trx);
      const avisos = total + 1 > LIMITES_CONTEUDO.paginasPorTopicoRecomendado
        ? [`O tópico passou do número recomendado de páginas (${LIMITES_CONTEUDO.paginasPorTopicoRecomendado}).`]
        : [];
      return { pagina: resumoPagina(pagina), avisos };
    });
  }

  async obterPagina(ctx: ContextoConteudo, paginaId: string) {
    const { pagina } = await this.paginaComAcesso(ctx, paginaId, "ler");
    return paginaCompleta(pagina);
  }

  // Título e visibilidade não mudam a versão do documento: não geram conflito com o editor aberto.
  async atualizarPagina(ctx: ContextoConteudo, paginaId: string, payload: AtualizarPaginaRequest) {
    return this.repository.transacao(async (trx) => {
      const { pagina } = await this.paginaComAcesso(ctx, paginaId, "editar", trx);
      const dados: Record<string, unknown> = { atualizado_por_usuario_id: ctx.usuarioId };
      const titulo = textoOpcional(payload?.titulo, "O título", LIMITES_CONTEUDO.tamanhoMaximoTitulo);
      if (titulo !== undefined) dados.titulo = titulo;
      if (payload?.oculta !== undefined) {
        if (typeof payload.oculta !== "boolean") throw erroConteudo.invalido("Visibilidade inválida.");
        dados.oculta = payload.oculta;
      }
      if (Object.keys(dados).length === 1) throw erroConteudo.invalido("Nenhum campo enviado para atualização.");
      await this.repository.atualizarPagina(paginaId, dados, trx);
      if (dados.oculta === true) await this.garantirPaginaVisivel(pagina.topico_id, trx);
      await this.repository.tocarTopico(pagina.topico_id, ctx.usuarioId, trx);
      return paginaCompleta(await this.repository.buscarPagina(paginaId, trx));
    });
  }

  async salvarBlocos(ctx: ContextoConteudo, paginaId: string, payload: SalvarBlocosRequest) {
    const versao = Number(payload?.versao);
    if (!Number.isInteger(versao) || versao < 1) throw erroConteudo.invalido("Versão da página inválida.");
    const { blocos, metricas, arquivoIds } = validarEMedirBlocos(payload?.blocos);

    const { pagina, cursoDisciplina } = await this.paginaComAcesso(ctx, paginaId, "editar");
    if ((await this.repository.contarArquivosDaDisciplina(arquivoIds, cursoDisciplina.id)) !== arquivoIds.length) {
      throw erroConteudo.invalido("A página referencia arquivos que não pertencem a esta disciplina.");
    }

    // Só bloqueia o que piora a situação: uma página que já passou do limite
    // ainda pode ser salva enquanto o professor a reduz.
    const anterior = metricasDaLinha(pagina);
    const { bloqueios, avisos } = avaliarLimitesDaPagina(metricas);
    const piorou =
      metricas.minutosEstimados > anterior.minutosEstimados ||
      metricas.videos > anterior.videos ||
      metricas.imagens > anterior.imagens;
    if (bloqueios.length && piorou) {
      throw erroConteudo.limite(bloqueios.join(" "), { metricas, bloqueios });
    }

    const salva = await this.repository.salvarBlocosSeVersao(paginaId, versao, {
      blocos: JSON.stringify(blocos),
      ...colunasDeMetricas(metricas),
      atualizado_por_usuario_id: ctx.usuarioId,
    });
    if (!salva) {
      const atual = await this.repository.buscarPagina(paginaId);
      throw erroConteudo.versaoDesatualizada({ pagina: atual ? paginaCompleta(atual) : null });
    }
    await this.repository.tocarTopico(pagina.topico_id, ctx.usuarioId);
    return {
      pagina: paginaCompleta(await this.repository.buscarPagina(paginaId)),
      avisos: [...avisos, ...bloqueios],
    };
  }

  async dividirPagina(ctx: ContextoConteudo, paginaId: string, payload: DividirPaginaRequest) {
    const versao = Number(payload?.versao);
    const indice = Number(payload?.aPartirDoBloco);
    if (!Number.isInteger(versao) || versao < 1) throw erroConteudo.invalido("Versão da página inválida.");

    return this.repository.transacao(async (trx) => {
      const { pagina } = await this.paginaComAcesso(ctx, paginaId, "editar", trx);
      const blocos: unknown[] = Array.isArray(pagina.blocos) ? pagina.blocos : [];
      if (!Number.isInteger(indice) || indice < 1 || indice >= blocos.length) {
        throw erroConteudo.invalido("Escolha um bloco entre o primeiro e o último para dividir a página.");
      }
      if ((await this.repository.contarPaginas(pagina.topico_id, trx)) >= LIMITES_CONTEUDO.paginasPorTopicoMaximo) {
        throw erroConteudo.limite(`Este tópico já atingiu o máximo de ${LIMITES_CONTEUDO.paginasPorTopicoMaximo} páginas.`);
      }
      const primeira = validarEMedirBlocos(blocos.slice(0, indice));
      const segunda = validarEMedirBlocos(blocos.slice(indice));

      const salva = await this.repository.salvarBlocosSeVersao(
        paginaId,
        versao,
        {
          blocos: JSON.stringify(primeira.blocos),
          ...colunasDeMetricas(primeira.metricas),
          atualizado_por_usuario_id: ctx.usuarioId,
        },
        trx,
      );
      if (!salva) throw erroConteudo.versaoDesatualizada({ pagina: paginaCompleta(pagina) });

      await this.repository.deslocarPaginas(pagina.topico_id, Number(pagina.ordem) + 1, trx);
      const nova = await this.repository.criarPagina(
        {
          topico_id: pagina.topico_id,
          titulo: null,
          ordem: Number(pagina.ordem) + 1,
          oculta: pagina.oculta,
          blocos: JSON.stringify(segunda.blocos),
          ...colunasDeMetricas(segunda.metricas),
          criado_por_usuario_id: ctx.usuarioId,
          atualizado_por_usuario_id: ctx.usuarioId,
        },
        trx,
      );
      await this.repository.tocarTopico(pagina.topico_id, ctx.usuarioId, trx);
      return {
        pagina: paginaCompleta(await this.repository.buscarPagina(paginaId, trx)),
        novaPagina: resumoPagina(nova),
      };
    });
  }

  async duplicarPagina(ctx: ContextoConteudo, paginaId: string) {
    return this.repository.transacao(async (trx) => {
      const { pagina } = await this.paginaComAcesso(ctx, paginaId, "editar", trx);
      if ((await this.repository.contarPaginas(pagina.topico_id, trx)) >= LIMITES_CONTEUDO.paginasPorTopicoMaximo) {
        throw erroConteudo.limite(`Este tópico já atingiu o máximo de ${LIMITES_CONTEUDO.paginasPorTopicoMaximo} páginas.`);
      }
      await this.repository.deslocarPaginas(pagina.topico_id, Number(pagina.ordem) + 1, trx);
      const nova = await this.repository.criarPagina(
        {
          topico_id: pagina.topico_id,
          titulo: copia(pagina.titulo, LIMITES_CONTEUDO.tamanhoMaximoTitulo),
          ordem: Number(pagina.ordem) + 1,
          oculta: pagina.oculta,
          blocos: JSON.stringify(pagina.blocos ?? []),
          ...colunasDeMetricas(metricasDaLinha(pagina)),
          criado_por_usuario_id: ctx.usuarioId,
          atualizado_por_usuario_id: ctx.usuarioId,
        },
        trx,
      );
      await this.repository.tocarTopico(pagina.topico_id, ctx.usuarioId, trx);
      return resumoPagina(nova);
    });
  }

  async excluirPagina(ctx: ContextoConteudo, paginaId: string) {
    await this.repository.transacao(async (trx) => {
      const { pagina } = await this.paginaComAcesso(ctx, paginaId, "editar", trx);
      await this.repository.excluirPagina(paginaId, trx);
      await this.garantirPaginaVisivel(pagina.topico_id, trx);
      await this.repository.tocarTopico(pagina.topico_id, ctx.usuarioId, trx);
    });
  }

  // Recebe a árvore inteira: reordena tópicos e páginas e move páginas entre tópicos.
  async reordenar(ctx: ContextoConteudo, cursoDisciplinaId: string, payload: OrdemRequest) {
    uuid(cursoDisciplinaId, "Disciplina inválida.");
    if (!payload || !Array.isArray(payload.topicos)) throw erroConteudo.invalido("Informe a nova ordem dos tópicos.");

    await this.repository.transacao(async (trx) => {
      await this.acessar(ctx, cursoDisciplinaId, "editar", trx);
      const topicos = await this.repository.listarTopicos(cursoDisciplinaId, trx);
      const paginas = await this.repository.listarPaginasDaDisciplina(cursoDisciplinaId, trx);
      const idsTopicos = new Set(topicos.map((t: any) => t.id));
      const idsPaginas = new Set(paginas.map((p: any) => p.id));

      const recebidosTopicos = payload.topicos.map((t) => t?.id);
      const recebidasPaginas = payload.topicos.flatMap((t) => (Array.isArray(t?.paginas) ? t.paginas : [null]));
      const mesmoConjunto = (recebidos: unknown[], esperados: Set<string>) =>
        recebidos.length === esperados.size &&
        new Set(recebidos).size === recebidos.length &&
        recebidos.every((id) => typeof id === "string" && esperados.has(id));
      if (!mesmoConjunto(recebidosTopicos, idsTopicos) || !mesmoConjunto(recebidasPaginas, idsPaginas)) {
        throw erroConteudo.conflito("A estrutura mudou desde que a tela foi carregada. Recarregue e tente novamente.");
      }

      const publicado = new Map(topicos.map((t: any) => [t.id, Boolean(t.publicado)]));
      const oculta = new Map(paginas.map((p: any) => [p.id, Boolean(p.oculta)]));
      for (const topico of payload.topicos) {
        if (topico.paginas.length > LIMITES_CONTEUDO.paginasPorTopicoMaximo) {
          throw erroConteudo.limite(`Um tópico pode ter no máximo ${LIMITES_CONTEUDO.paginasPorTopicoMaximo} páginas.`);
        }
        if (publicado.get(topico.id) && !topico.paginas.some((id) => !oculta.get(id))) {
          throw erroConteudo.limite("Um tópico publicado precisa manter ao menos uma página visível.");
        }
      }

      for (const [indiceTopico, topico] of payload.topicos.entries()) {
        await trx("piv.conteudo_topico").where({ id: topico.id }).update({ ordem: indiceTopico + 1 });
        for (const [indicePagina, paginaId] of topico.paginas.entries()) {
          await trx("piv.conteudo_pagina")
            .where({ id: paginaId })
            .update({ topico_id: topico.id, ordem: indicePagina + 1 });
        }
      }
    });
    return this.detalhar(ctx, cursoDisciplinaId);
  }

  // ---------- leitura publicada (aluno e pré-visualização) ----------

  // Só tópicos publicados e páginas visíveis, na ordem definida pelo professor.
  private async estruturaPublicada(cursoDisciplinaId: string) {
    const [topicos, paginas] = await Promise.all([
      this.repository.listarTopicos(cursoDisciplinaId),
      this.repository.listarPaginasDaDisciplina(cursoDisciplinaId),
    ]);
    return topicos
      .filter((t: any) => t.publicado)
      .map((t: any) => ({
        id: t.id,
        titulo: t.titulo,
        descricao: t.descricao ?? null,
        publicadoEm: t.publicado_em ?? null,
        paginas: paginas
          .filter((p: any) => p.topico_id === t.id && !p.oculta)
          .map((p: any) => ({ id: p.id, titulo: p.titulo ?? null, minutosEstimados: Number(p.minutos_estimados ?? 0) })),
      }))
      .filter((t: any) => t.paginas.length > 0);
  }

  async conteudoDoAluno(ctx: ContextoConteudo, turmaDisciplinaId: string) {
    if (ctx.perfil !== "aluno" || !ctx.alunoId) throw erroConteudo.proibido();
    uuid(turmaDisciplinaId, "Disciplina inválida.");
    const oferta = await this.repository.buscarOfertaDoAluno(ctx.alunoId, turmaDisciplinaId);
    if (!oferta) throw erroConteudo.proibido("Você não está matriculado nesta disciplina.");
    return {
      turmaDisciplinaId,
      disciplina: { id: oferta.disciplina_id, nome: oferta.disciplina_nome, codigo: oferta.disciplina_codigo },
      curso: { nome: oferta.curso_nome },
      turmaSigla: oferta.turma_sigla,
      professorNome: oferta.professor_nome ?? null,
      topicos: await this.estruturaPublicada(oferta.curso_disciplina_id),
    };
  }

  async visualizarComoAluno(ctx: ContextoConteudo, cursoDisciplinaId: string) {
    uuid(cursoDisciplinaId, "Disciplina inválida.");
    const { cursoDisciplina: cd } = await this.acessar(ctx, cursoDisciplinaId, "ler");
    return {
      turmaDisciplinaId: null,
      disciplina: { id: cd.disciplina_id, nome: cd.disciplina_nome, codigo: cd.disciplina_codigo },
      curso: { nome: cd.curso_nome },
      turmaSigla: null,
      professorNome: null,
      topicos: await this.estruturaPublicada(cursoDisciplinaId),
    };
  }

  // Página publicada: aluno matriculado na disciplina, ou quem edita (pré-visualização).
  async paginaPublicada(ctx: ContextoConteudo, paginaId: string) {
    uuid(paginaId, "Página inválida.");
    const pagina = await this.repository.buscarPagina(paginaId);
    if (!pagina || !pagina.topico_publicado || pagina.oculta) throw erroConteudo.naoEncontrado("Página não encontrada.");
    if (ctx.perfil === "aluno") {
      if (!ctx.alunoId || !(await this.repository.alunoAcessaCursoDisciplina(ctx.alunoId, pagina.curso_disciplina_id))) {
        throw erroConteudo.proibido("Você não está matriculado nesta disciplina.");
      }
    } else {
      await this.acessar(ctx, pagina.curso_disciplina_id, "ler");
    }
    return {
      id: pagina.id,
      titulo: pagina.titulo ?? null,
      topicoId: pagina.topico_id,
      blocos: Array.isArray(pagina.blocos) ? pagina.blocos : [],
      minutosEstimados: Number(pagina.minutos_estimados ?? 0),
      atualizadoEm: pagina.updated_at ?? null,
    };
  }

  // ---------- arquivos ----------

  async registrarArquivo(ctx: ContextoConteudo, cursoDisciplinaId: string, arquivo: ArquivoEnviado) {
    uuid(cursoDisciplinaId, "Disciplina inválida.");
    await this.acessar(ctx, cursoDisciplinaId, "editar");
    if (arquivo.mime.startsWith("image/") && arquivo.tamanhoBytes > LIMITES_CONTEUDO.tamanhoMaximoImagemBytes) {
      throw erroConteudo.invalido("A imagem passa de 8 MB. Envie uma versão menor.");
    }
    const registro = await this.repository.criarArquivo({
      curso_disciplina_id: cursoDisciplinaId,
      nome_original: arquivo.nomeOriginal.slice(0, 255),
      caminho: arquivo.caminho,
      mime: arquivo.mime,
      tamanho_bytes: arquivo.tamanhoBytes,
      enviado_por_usuario_id: ctx.usuarioId,
    });
    return {
      id: registro.id,
      url: `${PREFIXO_ARQUIVO}${registro.id}`,
      nome: registro.nome_original,
      mime: registro.mime,
      tamanhoBytes: Number(registro.tamanho_bytes),
    };
  }

  async obterArquivo(ctx: ContextoConteudo, arquivoId: string) {
    uuid(arquivoId, "Arquivo inválido.");
    const arquivo = await this.repository.buscarArquivo(arquivoId);
    if (!arquivo) throw erroConteudo.naoEncontrado("Arquivo não encontrado.");
    if (ctx.perfil === "aluno") {
      if (!ctx.alunoId || !(await this.repository.alunoAcessaCursoDisciplina(ctx.alunoId, arquivo.curso_disciplina_id))) {
        throw erroConteudo.proibido("Você não está matriculado nesta disciplina.");
      }
      return arquivo;
    }
    await this.acessar(ctx, arquivo.curso_disciplina_id, "ler");
    return arquivo;
  }
}
