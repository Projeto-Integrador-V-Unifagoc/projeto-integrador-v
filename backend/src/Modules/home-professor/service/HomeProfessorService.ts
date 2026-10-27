import type { Request } from "express";
import { calcularBoletim, type AvaliacaoResumo } from "../../notas/models/Nota";
import { CRITERIOS_PROFESSOR, type NivelAtencaoProfessor } from "../models/HomeProfessor";
import { HomeProfessorRepository } from "../repository/HomeProfessorRepository";

export class HomeProfessorService {
  repository = new HomeProfessorRepository();

  async dashboard(req: Request, periodoSolicitado?: string) {
    const professor = await this.contexto(req);
    const periodos = await this.repository.listarPeriodos(professor.id);
    const periodo = periodoSolicitado
      ? periodos.find((item: any) => String(item.id) === periodoSolicitado)
      : periodos.find((item: any) => item.ativo) ?? periodos[0];

    if (periodoSolicitado && !periodo) {
      throw this.erro("Periodo letivo fora das atribuicoes do professor", 404);
    }
    if (!periodo) return this.vazio(professor, periodos);

    const dados = await this.carregar(professor.id, String(periodo.id));
    const atribuicoes = this.montarAtribuicoes(dados);
    const alunosUnicos = new Set(dados.alunos.map((item: any) => String(item.aluno_id))).size;
    const lancamentosPendentes = atribuicoes.reduce((total: number, item: any) => total + item.lancamentosPendentes, 0);
    const alertas = atribuicoes.flatMap((item: any) => item.alunos
      .filter((aluno: any) => aluno.nivel === "CRITICO" || aluno.nivel === "ATENCAO")
      .map((aluno: any) => ({ ...aluno, turmaDisciplinaId: item.id, disciplinaNome: item.disciplina.nome, turmaSigla: item.turma.sigla })))
      .sort((a: any, b: any) => this.prioridade(a.nivel) - this.prioridade(b.nivel));

    return {
      professor,
      periodoSelecionado: this.periodo(periodo),
      periodosDisponiveis: periodos.map((item: any) => this.periodo(item)),
      criterios: CRITERIOS_PROFESSOR,
      resumo: {
        turmasAtivas: new Set(atribuicoes.map((item: any) => item.turma.id)).size,
        disciplinasDistintas: new Set(atribuicoes.map((item: any) => item.disciplina.id)).size,
        alunosUnicos,
        lancamentosPendentes,
      },
      atribuicoes: atribuicoes.map(({ alunos: _alunos, ...item }: any) => item),
      avaliacoesProximas: this.avaliacoesProximas(dados.avaliacoes, atribuicoes),
      alunosEmAtencao: alertas.slice(0, 12),
      geradoEm: new Date().toISOString(),
    };
  }

  async detalhe(req: Request, turmaDisciplinaId: string) {
    const professor = await this.contexto(req);
    const periodos = await this.repository.listarPeriodos(professor.id);
    for (const periodo of periodos) {
      const dados = await this.carregar(professor.id, String((periodo as any).id), turmaDisciplinaId);
      const [atribuicao] = this.montarAtribuicoes(dados);
      if (atribuicao) {
        return {
          ...atribuicao,
          periodo: this.periodo(periodo),
          competencias: await this.repository.listarCompetencias(atribuicao.disciplina.id),
        };
      }
    }
    throw this.erro("Turma/disciplina nao encontrada nas atribuicoes do professor", 404);
  }

  async detalheAluno(req: Request, turmaDisciplinaId: string, alunoId: string) {
    const professor = await this.contexto(req);
    const periodos = await this.repository.listarPeriodos(professor.id);
    for (const periodo of periodos) {
      const dados = await this.carregar(professor.id, String((periodo as any).id), turmaDisciplinaId);
      const [atribuicao] = this.montarAtribuicoes(dados);
      if (!atribuicao) continue;

      const aluno = atribuicao.alunos.find((item: any) => String(item.id) === alunoId);
      const vinculo = dados.alunos.find((item: any) =>
        String(item.turma_disciplina_id) === turmaDisciplinaId && String(item.aluno_id) === alunoId,
      );
      if (!aluno || !vinculo) throw this.erro("Aluno nao encontrado nesta turma/disciplina", 404);

      const notas = new Map(
        dados.notas
          .filter((item: any) => String(item.matricula_turma_disciplina_id) === String(vinculo.matricula_turma_disciplina_id))
          .map((item: any) => [String(item.avaliacao_id), Number(item.nota_valor)]),
      );
      const frequencia: any = dados.frequencias.find((item: any) =>
        String(item.matricula_turma_disciplina_id) === String(vinculo.matricula_turma_disciplina_id),
      );
      const presencas = Number(frequencia?.presencas ?? 0);
      const faltas = Number(frequencia?.faltas ?? 0);
      const avaliacoes = dados.avaliacoes
        .filter((item: any) => String(item.turma_disciplina_id) === turmaDisciplinaId)
        .map((item: any) => {
          const nota = notas.get(String(item.id));
          return {
            id: String(item.id),
            titulo: item.descricao_avaliacao || item.tipo_avaliacao,
            tipo: item.tipo_avaliacao,
            valor: Number(item.valor),
            dataDevolucao: this.dataIso(item.data_devolucao),
            nota: nota ?? null,
            percentual: nota === undefined || Number(item.valor) <= 0
              ? null
              : this.numero(100 * nota / Number(item.valor)),
            status: nota === undefined ? "PENDENTE" : "LANCADA",
          };
        });
      const pendentes = avaliacoes.filter((item: any) => item.status === "PENDENTE");
      const vencidas = pendentes.filter((item: any) =>
        item.dataDevolucao && new Date(`${item.dataDevolucao}T23:59:59`).getTime() <= Date.now(),
      );

      return {
        aluno: { id: aluno.id, matricula: aluno.matricula, nome: aluno.nome },
        contexto: {
          turma: atribuicao.turma,
          curso: atribuicao.curso,
          disciplina: atribuicao.disciplina,
          periodo: this.periodo(periodo),
        },
        resumo: {
          media: aluno.media,
          frequencia: aluno.frequencia,
          nivel: aluno.nivel,
          motivo: aluno.motivo,
          presencas,
          faltas,
          totalAulas: presencas + faltas,
          avaliacoesLancadas: avaliacoes.length - pendentes.length,
          totalAvaliacoes: avaliacoes.length,
        },
        criterios: CRITERIOS_PROFESSOR,
        pontosAtencao: this.pontosAtencao(aluno, pendentes.length, vencidas.length),
        avaliacoes,
      };
    }
    throw this.erro("Turma/disciplina nao encontrada nas atribuicoes do professor", 404);
  }

  private carregar(professorId: string, periodoId: string, turmaDisciplinaId?: string) {
    return Promise.all([
      this.repository.listarAtribuicoes(professorId, periodoId, turmaDisciplinaId),
      this.repository.listarAlunos(professorId, periodoId, turmaDisciplinaId),
      this.repository.listarNotas(professorId, periodoId, turmaDisciplinaId),
      this.repository.listarFrequencias(professorId, periodoId, turmaDisciplinaId),
      this.repository.listarAvaliacoes(professorId, periodoId, turmaDisciplinaId),
    ]).then(([atribuicoes, alunos, notas, frequencias, avaliacoes]) => ({ atribuicoes, alunos, notas, frequencias, avaliacoes }));
  }

  private montarAtribuicoes(dados: any) {
    const notas = new Map<string, Map<string, number>>();
    for (const item of dados.notas) {
      const matricula = String(item.matricula_turma_disciplina_id);
      if (!notas.has(matricula)) notas.set(matricula, new Map());
      notas.get(matricula)!.set(String(item.avaliacao_id), Number(item.nota_valor));
    }
    const frequencias = new Map(dados.frequencias.map((item: any) => [String(item.matricula_turma_disciplina_id), item]));
    return dados.atribuicoes.map((row: any) => {
      const alunos = dados.alunos
        .filter((item: any) => String(item.turma_disciplina_id) === String(row.turma_disciplina_id))
        .map((item: any) => {
          const mapaNotas = notas.get(String(item.matricula_turma_disciplina_id)) ?? new Map<string, number>();
          const frequencia: any = frequencias.get(String(item.matricula_turma_disciplina_id));
          const avaliacoesAluno: AvaliacaoResumo[] = dados.avaliacoes
            .filter((avaliacao: any) => String(avaliacao.turma_disciplina_id) === String(item.turma_disciplina_id))
            .map((avaliacao: any) => ({
              id: String(avaliacao.id), tipo: avaliacao.tipo_avaliacao,
              descricao: avaliacao.descricao_avaliacao ?? null, valor: Number(avaliacao.valor),
            }));
          const boletim = calcularBoletim(avaliacoesAluno, mapaNotas);
          const media = boletim.mediaFinal ?? boletim.mediaParcial;
          const totalChamadas = Number(frequencia?.presencas ?? 0) + Number(frequencia?.faltas ?? 0);
          const percentualFrequencia = totalChamadas > 0 ? 100 * Number(frequencia.presencas) / totalChamadas : null;
          const nivel = this.nivel(media, percentualFrequencia);
          return {
            id: String(item.aluno_id), matricula: item.matricula, nome: item.aluno_nome,
            media: this.numero(media), frequencia: this.numero(percentualFrequencia), nivel,
            motivo: this.motivo(nivel, media, percentualFrequencia),
          };
        });
      const avaliacoes = dados.avaliacoes.filter((item: any) => String(item.turma_disciplina_id) === String(row.turma_disciplina_id));
      const vencidas = avaliacoes.filter((item: any) => {
        const dataNormalizada = this.dataIso(item.data_devolucao);
        const data = dataNormalizada ? new Date(`${dataNormalizada}T23:59:59`) : null;
        return Number(item.notas_lancadas) < alunos.length && (!data || data.getTime() <= Date.now());
      });
      const medias = alunos.map((item: any) => item.media).filter((valor: any) => valor !== null);
      const frequenciasValidas = alunos.map((item: any) => item.frequencia).filter((valor: any) => valor !== null);
      return {
        id: String(row.turma_disciplina_id),
        turma: { id: String(row.turma_id), sigla: row.turma_sigla, descricao: row.turma_descricao, turno: row.turno },
        curso: { id: String(row.curso_id), nome: row.curso_nome },
        disciplina: {
          id: String(row.disciplina_id), codigo: row.disciplina_codigo, nome: row.disciplina_nome,
          areaConhecimento: row.area_conhecimento ?? null, ementa: row.ementa ?? null,
          cargaHoraria: Number(row.carga_horaria),
        },
        totalAlunos: alunos.length,
        alunosComNota: medias.length,
        alunosComFrequencia: frequenciasValidas.length,
        mediaTurma: this.media(medias),
        frequenciaMedia: this.media(frequenciasValidas),
        alunosEmAtencao: alunos.filter((item: any) => item.nivel === "CRITICO" || item.nivel === "ATENCAO").length,
        totalAvaliacoes: avaliacoes.length,
        lancamentosPendentes: vencidas.length,
        alunos,
      };
    });
  }

  private avaliacoesProximas(avaliacoes: any[], atribuicoes: any[]) {
    const nomes = new Map(atribuicoes.map((item: any) => [item.id, item]));
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return avaliacoes.filter((item) => {
      const data = this.dataIso(item.data_devolucao);
      return data && new Date(`${data}T00:00:00`) >= hoje;
    })
      .slice(0, 8)
      .map((item) => {
        const atribuicao: any = nomes.get(String(item.turma_disciplina_id));
        return {
          id: String(item.id), turmaDisciplinaId: String(item.turma_disciplina_id),
          titulo: item.descricao_avaliacao || item.tipo_avaliacao, tipo: item.tipo_avaliacao,
          data: this.dataIso(item.data_devolucao)!, valor: Number(item.valor),
          disciplinaNome: atribuicao?.disciplina.nome ?? "Disciplina", turmaSigla: atribuicao?.turma.sigla ?? "—",
          notasLancadas: Number(item.notas_lancadas), notasEsperadas: atribuicao?.totalAlunos ?? 0,
        };
      });
  }

  private dataIso(valor: unknown) {
    if (!valor) return null;
    if (valor instanceof Date) return valor.toISOString().slice(0, 10);
    const texto = String(valor);
    const iso = texto.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (iso) return iso;
    const data = new Date(texto);
    return Number.isNaN(data.getTime()) ? null : data.toISOString().slice(0, 10);
  }

  private pontosAtencao(aluno: any, pendentes: number, vencidas: number) {
    const pontos: Array<{ id: string; severidade: "CRITICO" | "ATENCAO" | "INFORMATIVO"; titulo: string; descricao: string }> = [];
    if (aluno.frequencia !== null && aluno.frequencia < CRITERIOS_PROFESSOR.frequenciaMinima) {
      pontos.push({ id: "frequencia-critica", severidade: "CRITICO", titulo: "Frequência abaixo do mínimo", descricao: `O aluno possui ${this.numero(aluno.frequencia)}% de frequência. O mínimo definido é ${CRITERIOS_PROFESSOR.frequenciaMinima}%.` });
    } else if (aluno.frequencia !== null && aluno.frequencia <= CRITERIOS_PROFESSOR.frequenciaAtencao) {
      pontos.push({ id: "frequencia-atencao", severidade: "ATENCAO", titulo: "Frequência próxima do limite", descricao: `A frequência atual é ${this.numero(aluno.frequencia)}%, próxima do mínimo de ${CRITERIOS_PROFESSOR.frequenciaMinima}%.` });
    }
    if (aluno.media !== null && aluno.media < CRITERIOS_PROFESSOR.mediaMinima) {
      pontos.push({ id: "media-baixa", severidade: aluno.media < 40 ? "CRITICO" : "ATENCAO", titulo: "Média abaixo do esperado", descricao: `A média parcial é ${this.numero(aluno.media)}%. O critério atual de referência é ${CRITERIOS_PROFESSOR.mediaMinima}%.` });
    }
    if (vencidas > 0) {
      pontos.push({ id: "avaliacoes-vencidas", severidade: "ATENCAO", titulo: "Avaliações vencidas sem nota", descricao: `${vencidas} ${vencidas === 1 ? "avaliação está" : "avaliações estão"} sem nota após a data de devolução.` });
    } else if (pendentes > 0) {
      pontos.push({ id: "avaliacoes-pendentes", severidade: "INFORMATIVO", titulo: "Avaliações aguardando lançamento", descricao: `${pendentes} ${pendentes === 1 ? "avaliação ainda não possui" : "avaliações ainda não possuem"} nota registrada.` });
    }
    if (aluno.media === null && aluno.frequencia === null) {
      pontos.push({ id: "sem-dados", severidade: "INFORMATIVO", titulo: "Dados insuficientes", descricao: "Ainda não há notas ou frequência suficientes para avaliar o acompanhamento do aluno." });
    }
    return pontos;
  }

  private async contexto(req: Request) {
    const user = (req as any).user;
    if (!user?.id || String(user.tipo_usuario).toLowerCase() !== "professor") {
      throw this.erro("Recurso disponivel apenas para professores", 403);
    }
    const professor = await this.repository.buscarProfessorPorUsuarioId(String(user.id));
    if (!professor?.id || professor.ativo === false) throw this.erro("Usuario sem vinculo de professor ativo", 403);
    return { id: String(professor.id), nome: professor.nome };
  }

  private vazio(professor: any, periodos: any[]) {
    return {
      professor, periodoSelecionado: null, periodosDisponiveis: periodos.map((item) => this.periodo(item)),
      criterios: CRITERIOS_PROFESSOR,
      resumo: { turmasAtivas: 0, disciplinasDistintas: 0, alunosUnicos: 0, lancamentosPendentes: 0 },
      atribuicoes: [], avaliacoesProximas: [], alunosEmAtencao: [], geradoEm: new Date().toISOString(),
    };
  }

  private periodo(item: any) {
    return { id: String(item.id), codigo: item.codigo, ano: Number(item.ano), semestre: Number(item.semestre), ativo: Boolean(item.ativo), status: item.status };
  }
  private nivel(media: number | null, frequencia: number | null): NivelAtencaoProfessor {
    if (frequencia !== null && frequencia < CRITERIOS_PROFESSOR.frequenciaMinima) return "CRITICO";
    if ((media !== null && media < CRITERIOS_PROFESSOR.mediaMinima) ||
        (frequencia !== null && frequencia <= CRITERIOS_PROFESSOR.frequenciaAtencao)) return "ATENCAO";
    if (media === null && frequencia === null) return "SEM_DADOS";
    return "REGULAR";
  }
  private motivo(nivel: NivelAtencaoProfessor, media: number | null, frequencia: number | null) {
    if (nivel === "CRITICO") return `Frequencia de ${this.numero(frequencia)}%, abaixo do minimo`;
    if (media !== null && media < CRITERIOS_PROFESSOR.mediaMinima) return `Media parcial de ${this.numero(media)}%`;
    if (nivel === "ATENCAO") return `Frequencia proxima do limite (${this.numero(frequencia)}%)`;
    if (nivel === "SEM_DADOS") return "Aguardando lancamentos";
    return "Dentro dos criterios atuais";
  }
  private media(valores: number[]) { return valores.length ? this.numero(valores.reduce((a, b) => a + b, 0) / valores.length) : null; }
  private numero(valor: number | null) { return valor === null ? null : Number(valor.toFixed(1)); }
  private prioridade(nivel: NivelAtencaoProfessor) { return nivel === "CRITICO" ? 0 : nivel === "ATENCAO" ? 1 : 2; }
  private erro(message: string, status: number) { return Object.assign(new Error(message), { status }); }
}
