import type { Request } from "express";
import { CRITERIOS_COORDENACAO, type ClassificacaoCoordenacao } from "../models/HomeCoordenacao";
import { HomeCoordenacaoRepository } from "../repository/HomeCoordenacaoRepository";

export class HomeCoordenacaoService {
  repository = new HomeCoordenacaoRepository();

  async dashboard(req: Request, periodoLetivoId?: string) {
    this.validarAcesso(req);
    const periodos = await this.repository.listarPeriodos();
    const periodo = periodoLetivoId
      ? periodos.find((item: any) => String(item.id) === String(periodoLetivoId))
      : periodos.find((item: any) => Boolean(item.ativo)) ?? periodos[0];
    if (periodoLetivoId && !periodo) throw this.erro("Periodo letivo nao encontrado", 404);
    if (!periodo) return this.vazio(periodos);

    const [resumo, diagnostico, matrizes, panorama, competencias] = await Promise.all([
      this.repository.resumoPeriodo(String(periodo.id)),
      this.repository.diagnosticoQualidade(String(periodo.id)),
      this.repository.listarStatusMatrizes(),
      this.repository.listarPanoramaCursos(String(periodo.id)),
      this.repository.listarDesempenhoCompetencias(String(periodo.id)),
    ]);

    const ofertas = Number(resumo.ofertas_ativas ?? 0);
    const avaliacoes = Number(resumo.avaliacoes ?? 0);
    return {
      periodoSelecionado: this.periodo(periodo),
      periodosDisponiveis: periodos.map((item: any) => this.periodo(item)),
      criteriosCompetencia: CRITERIOS_COORDENACAO,
      resumo: {
        turmasAtivas: Number(resumo.turmas_ativas ?? 0),
        ofertasAtivas: ofertas,
        alunosAtivos: Number(resumo.alunos_ativos ?? 0),
        ofertasComHorario: Number(resumo.ofertas_com_horario ?? 0),
        coberturaHorarios: this.percentual(Number(resumo.ofertas_com_horario ?? 0), ofertas),
        avaliacoes,
        avaliacoesMapeadas: Number(resumo.avaliacoes_mapeadas ?? 0),
        coberturaCompetencias: this.percentual(Number(resumo.avaliacoes_mapeadas ?? 0), avaliacoes),
      },
      matrizes: this.matrizes(matrizes),
      panoramaCursos: panorama.map((item: any) => {
        const totalOfertas = Number(item.ofertas_ativas ?? 0);
        const comHorario = Number(item.ofertas_com_horario ?? 0);
        return {
          id: String(item.id), codigo: item.codigo, nome: item.nome,
          turmasAtivas: Number(item.turmas_ativas ?? 0), ofertasAtivas: totalOfertas,
          alunosAtivos: Number(item.alunos_ativos ?? 0), ofertasComHorario: comHorario,
          coberturaHorarios: this.percentual(comHorario, totalOfertas),
        };
      }),
      competencias: competencias
        .map((item: any) => this.competencia(item))
        .sort((a: any, b: any) => this.prioridade(a.classificacao) - this.prioridade(b.classificacao) || (a.media ?? 101) - (b.media ?? 101)),
      qualidade: this.qualidade(diagnostico),
      geradoEm: new Date().toISOString(),
    };
  }

  private competencia(item: any) {
    const planejados = Number(item.pontos_planejados ?? 0);
    const avaliados = Number(item.pontos_avaliados ?? 0);
    const cobertura = this.percentual(avaliados, planejados);
    const media = avaliados > 0 ? this.numero(Number(item.soma_ponderada ?? 0) / avaliados) : null;
    return {
      id: String(item.id), codigo: item.codigo, nome: item.nome, tipo: item.tipo,
      media, cobertura, totalOfertas: Number(item.total_ofertas ?? 0), totalCursos: Number(item.total_cursos ?? 0),
      classificacao: this.classificar(media, cobertura),
    };
  }

  private qualidade(item: any) {
    return [
      { id: "disciplinas-sem-ementa", titulo: "Disciplinas sem ementa", descricao: `${item.disciplinas_sem_ementa} de ${item.disciplinas} disciplinas ativas`, quantidade: item.disciplinas_sem_ementa, severidade: "ATENCAO", rota: "/disciplinas/lista" },
      { id: "disciplinas-sem-competencias", titulo: "Disciplinas sem competências", descricao: `${item.disciplinas_sem_competencias} de ${item.disciplinas} disciplinas ativas`, quantidade: item.disciplinas_sem_competencias, severidade: "ATENCAO", rota: "/disciplinas/lista" },
      { id: "carga-incompleta", titulo: "Composição de carga incompleta", descricao: `${item.disciplinas_carga_incompleta} disciplinas precisam de revisão`, quantidade: item.disciplinas_carga_incompleta, severidade: "ATENCAO", rota: "/disciplinas/lista" },
      { id: "curso-sem-matriz", titulo: "Cursos sem matriz vigente", descricao: `${item.cursos_sem_matriz} de ${item.cursos} cursos`, quantidade: item.cursos_sem_matriz, severidade: "CRITICO", rota: "/cursos/lista" },
      { id: "turmas-sem-horario", titulo: "Turmas sem horários", descricao: `${item.turmas_sem_horario} de ${item.turmas} turmas do período`, quantidade: item.turmas_sem_horario, severidade: "ATENCAO", rota: "/turmas/lista" },
      { id: "avaliacoes-sem-competencia", titulo: "Avaliações sem competências", descricao: `${item.avaliacoes_sem_competencia} de ${item.avaliacoes} avaliações do período`, quantidade: item.avaliacoes_sem_competencia, severidade: "INFORMATIVO", rota: "/avaliacoes/lista" },
    ];
  }

  private matrizes(rows: any[]) {
    const resultado = { vigentes: 0, rascunhos: 0, encerradas: 0 };
    for (const row of rows) {
      if (row.status === "VIGENTE") resultado.vigentes = Number(row.total);
      if (row.status === "RASCUNHO") resultado.rascunhos = Number(row.total);
      if (row.status === "ENCERRADA") resultado.encerradas = Number(row.total);
    }
    return resultado;
  }

  private classificar(media: number | null, cobertura: number): ClassificacaoCoordenacao {
    if (media === null || cobertura < CRITERIOS_COORDENACAO.coberturaMinima) return "DADOS_INSUFICIENTES";
    if (media < CRITERIOS_COORDENACAO.dificuldadeAbaixoDe) return "DIFICULDADE";
    if (media < CRITERIOS_COORDENACAO.atencaoAbaixoDe) return "ATENCAO";
    return "ADEQUADO";
  }

  private validarAcesso(req: Request) {
    const perfil = String((req as any).user?.tipo_usuario ?? "").toLowerCase();
    if (perfil !== "secretaria" && perfil !== "administrador") throw this.erro("Recurso disponivel apenas para secretaria e administradores", 403);
  }

  private periodo(item: any) {
    return { id: String(item.id), codigo: item.codigo, ano: Number(item.ano), semestre: Number(item.semestre), ativo: Boolean(item.ativo), status: item.status, dataInicio: this.dataIso(item.data_inicio), dataFim: this.dataIso(item.data_fim) };
  }
  private vazio(periodos: any[]) {
    return { periodoSelecionado: null, periodosDisponiveis: periodos, criteriosCompetencia: CRITERIOS_COORDENACAO, resumo: { turmasAtivas: 0, ofertasAtivas: 0, alunosAtivos: 0, ofertasComHorario: 0, coberturaHorarios: 0, avaliacoes: 0, avaliacoesMapeadas: 0, coberturaCompetencias: 0 }, matrizes: { vigentes: 0, rascunhos: 0, encerradas: 0 }, panoramaCursos: [], competencias: [], qualidade: [], geradoEm: new Date().toISOString() };
  }
  private percentual(parte: number, total: number) { return total > 0 ? this.numero(100 * parte / total) ?? 0 : 0; }
  private numero(valor: number | null) { return valor === null || !Number.isFinite(valor) ? null : Number(valor.toFixed(1)); }
  private prioridade(valor: ClassificacaoCoordenacao) { return valor === "DIFICULDADE" ? 0 : valor === "ATENCAO" ? 1 : valor === "ADEQUADO" ? 2 : 3; }
  private dataIso(valor: unknown) { if (!valor) return null; if (valor instanceof Date) return valor.toISOString().slice(0, 10); return String(valor).slice(0, 10); }
  private erro(message: string, status: number) { return Object.assign(new Error(message), { status }); }
}

