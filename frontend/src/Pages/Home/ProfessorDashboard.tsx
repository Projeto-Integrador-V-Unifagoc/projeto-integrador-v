import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button } from "@mui/material";
import { AlertTriangle, ClipboardX, TrendingUp, Users } from "lucide-react";
import Container from "../../components/Container";
import { perguntarAoAssistente, useAssistenteDisponivel } from "../../components/AssistenteWidget/ponte";
import { AssistenteIaCaixa, DashboardLayout, DashboardRodape } from "../../components/DashboardLayout";
import type { IndicadorDashboard } from "../../components/DashboardLayout";
import type { AtribuicaoProfessor, DashboardProfessor, DetalheAlunoAtencaoProfessor, DetalheAtribuicaoProfessor } from "../../models/home-professor-model";
import { homeProfessorApi } from "../../services/home-professor-api";
import AlunoDetalhesDrawer from "./AlunoDetalhesDrawer";
import TurmaDetalhesDrawer from "./TurmaDetalhesDrawer";
import { fmtPct, resumirNomes } from "./aluno/regras-dashboard-aluno";
import AlunosAtencaoPainel from "./professor/AlunosAtencaoPainel";
import AproveitamentoPainel from "./professor/AproveitamentoPainel";
import FiltrosProfessor from "./professor/FiltrosProfessor";
import MinhasTurmasPainel from "./professor/MinhasTurmasPainel";
import PendenciasLancamentoPainel from "./professor/PendenciasLancamentoPainel";
import {
  MEDIA_REFERENCIA,
  TODAS,
  calcularAproveitamento,
  filtrarPorSelecao,
  gerarCsvAlunos,
  listarAlunosEmAtencao,
  listarPendencias,
  opcoesFiltro,
  resumoIndicadores,
} from "./professor/regras-dashboard-professor";
import type { SelecaoProfessor } from "./professor/regras-dashboard-professor";

const plural = (quantidade: number, singular: string, pluralTexto: string) => `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;
const SELECAO_INICIAL: SelecaoProfessor = { turmaId: TODAS, disciplinaId: TODAS };

// Marca de ordem de bytes: faz o Excel abrir o CSV em UTF-8.
const BOM_UTF8 = String.fromCharCode(0xfeff);

function baixarCsv(conteudo: string, nomeArquivo: string) {
  const blob = new Blob([BOM_UTF8 + conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ProfessorDashboard({ userName }: { userName: string }) {
  const navigate = useNavigate();
  // Assistente do sistema (widget do MainLayout). Indisponível = botões e caixa ficam visíveis, mas inertes.
  const iaDisponivel = useAssistenteDisponivel();
  const [dados, setDados] = useState<DashboardProfessor | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [selecao, setSelecao] = useState<SelecaoProfessor>(SELECAO_INICIAL);
  const [detalhe, setDetalhe] = useState<DetalheAtribuicaoProfessor | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [alunoAberto, setAlunoAberto] = useState(false);
  const [detalheAluno, setDetalheAluno] = useState<DetalheAlunoAtencaoProfessor | null>(null);
  const [carregandoAluno, setCarregandoAluno] = useState(false);
  const [erroAluno, setErroAluno] = useState("");

  const carregar = useCallback(async (periodoId?: string, atualizacao = false) => {
    if (atualizacao) setRecarregando(true); else setCarregando(true);
    try { setDados(await homeProfessorApi.dashboard(periodoId)); setErro(""); }
    catch { setErro("Não foi possível carregar o dashboard do professor."); }
    finally { setCarregando(false); setRecarregando(false); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function abrirDetalhe(item: AtribuicaoProfessor) {
    setCarregandoDetalhe(true);
    try { setDetalhe(await homeProfessorApi.detalhe(item.id)); }
    catch { setErro("Não foi possível carregar os detalhes da turma."); }
    finally { setCarregandoDetalhe(false); }
  }

  async function abrirAluno(turmaDisciplinaId: string, alunoId: string) {
    setAlunoAberto(true);
    setDetalheAluno(null);
    setErroAluno("");
    setCarregandoAluno(true);
    try { setDetalheAluno(await homeProfessorApi.detalheAluno(turmaDisciplinaId, alunoId)); }
    catch { setErroAluno("Não foi possível carregar o detalhamento deste aluno."); }
    finally { setCarregandoAluno(false); }
  }

  function trocarPeriodo(periodoId: string) {
    setSelecao(SELECAO_INICIAL);
    void carregar(periodoId);
  }

  const opcoes = useMemo(() => opcoesFiltro(dados?.atribuicoes ?? []), [dados]);
  const filtrado = useMemo(() => filtrarPorSelecao(
    { atribuicoes: dados?.atribuicoes ?? [], avaliacoes: dados?.avaliacoes ?? [], chamadas: dados?.chamadasPendentes ?? [] },
    selecao,
  ), [dados, selecao]);
  const resumo = useMemo(() => resumoIndicadores(filtrado.atribuicoes, filtrado.avaliacoes), [filtrado]);
  const alunosAtencao = useMemo(() => listarAlunosEmAtencao(filtrado.atribuicoes), [filtrado]);
  const aproveitamento = useMemo(() => calcularAproveitamento(filtrado.atribuicoes, filtrado.avaliacoes), [filtrado]);
  const pendencias = useMemo(() => listarPendencias(filtrado.avaliacoes, filtrado.chamadas, filtrado.atribuicoes), [filtrado]);
  const ofertasComPendencia = useMemo(() => new Set(pendencias.map((item) => item.turmaDisciplinaId)), [pendencias]);

  if (!carregando && !dados) {
    return <Container sx={{ p: 0, border: 0 }}><Alert severity="error" action={<Button color="inherit" onClick={() => void carregar()} sx={{ width: "auto", minWidth: 124, whiteSpace: "nowrap" }}>Tentar novamente</Button>}>{erro}</Alert></Container>;
  }

  const periodo = dados?.periodoSelecionado ?? null;
  const filtroAtivo = selecao.turmaId !== TODAS || selecao.disciplinaId !== TODAS;

  // Cor só quando o KPI pede ação; o resto fica neutro.
  const indicadores: IndicadorDashboard[] = [
    {
      id: "turmas",
      titulo: "Turmas ativas",
      icone: Users,
      valor: String(resumo.turmas),
      apoio: resumo.disciplinas ? `${plural(resumo.disciplinas, "disciplina", "disciplinas")} · ${resumirNomes(resumo.nomesDisciplinas)}` : "Nenhuma disciplina vinculada",
    },
    {
      id: "media",
      titulo: "Média das turmas",
      icone: TrendingUp,
      alerta: aproveitamento.mediaGeral !== null && aproveitamento.mediaGeral < MEDIA_REFERENCIA ? "atencao" : undefined,
      valor: fmtPct(aproveitamento.mediaGeral, 0),
      apoio: aproveitamento.alunosComNota
        ? `${aproveitamento.alunosAcimaReferencia} de ${aproveitamento.alunosComNota} alunos com média ≥ ${MEDIA_REFERENCIA}%`
        : "Aguardando as primeiras notas",
    },
    {
      id: "atencao",
      titulo: "Alunos em atenção",
      icone: AlertTriangle,
      alerta: resumo.possuiCritico ? "critico" : resumo.alunosEmAtencao ? "atencao" : undefined,
      valor: String(resumo.alunosEmAtencao),
      complemento: resumo.percentualAtencao !== null && resumo.alunosEmAtencao ? `${fmtPct(resumo.percentualAtencao, 0)} da turma` : undefined,
      apoio: `${resumo.alunosCriticos ? `${resumo.alunosCriticos} em risco alto · ` : ""}de ${plural(resumo.alunosUnicos, "aluno", "alunos")}`,
    },
    {
      id: "notas",
      titulo: "Notas faltantes",
      icone: ClipboardX,
      alerta: resumo.notasFaltantes ? "atencao" : undefined,
      valor: String(resumo.notasFaltantes),
      apoio: resumo.avaliacoesComNotasFaltantes
        ? `em ${plural(resumo.avaliacoesComNotasFaltantes, "avaliação vencida", "avaliações vencidas")}`
        : "Nenhum lançamento atrasado",
    },
  ];

  // Resumo acionável abaixo da saudação (o que pede ação agora).
  const resumoAcao = [
    resumo.alunosCriticos ? plural(resumo.alunosCriticos, "aluno em risco alto", "alunos em risco alto") : null,
    pendencias.length ? plural(pendencias.length, "pendência de lançamento", "pendências de lançamento") : null,
  ].filter(Boolean).join(" · ") || "Nenhuma pendência no momento";
  const horarioAtualizacao = dados ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(dados.geradoEm)) : null;

  return (
    <>
      <DashboardLayout
        carregando={carregando}
        nome={dados?.professor.nome || userName}
        contexto={`${resumoAcao}${filtroAtivo ? " (filtro aplicado)" : ""}`}
        extrasCabecalho={dados && (
          <FiltrosProfessor
            periodos={dados.periodosDisponiveis}
            periodoId={periodo?.id ?? ""}
            onPeriodo={trocarPeriodo}
            turmas={opcoes.turmas}
            disciplinas={opcoes.disciplinas}
            selecao={selecao}
            onSelecao={setSelecao}
          />
        )}
        assistente={<AssistenteIaCaixa placeholder="Pergunte sobre suas turmas e o desempenho dos alunos…" sugestoes={["Quais alunos precisam de atenção?", "Quais avaliações estão com notas faltantes?"]} onEnviar={iaDisponivel ? (pergunta) => perguntarAoAssistente(pergunta) : undefined} />}
        avisos={dados && (erro || !dados.atribuicoes.length) ? (
          <>
            {erro && <Alert severity="warning">{erro}</Alert>}
            {!dados.atribuicoes.length && <Alert severity="info">Você não possui turmas vinculadas ao período selecionado.</Alert>}
          </>
        ) : undefined}
        indicadores={indicadores}
        painelPrincipal={<AlunosAtencaoPainel key={`${periodo?.id}-${selecao.turmaId}-${selecao.disciplinaId}`} alunos={alunosAtencao} onConsultar={(turmaDisciplinaId, alunoId) => void abrirAluno(turmaDisciplinaId, alunoId)} onAnalisar={iaDisponivel ? (aluno) => perguntarAoAssistente(`Analisar ${aluno.nome} em ${aluno.disciplinaNome} (${aluno.turmaSigla})`, { tipo: "analisar_aluno", turmaDisciplinaId: aluno.turmaDisciplinaId, alunoId: aluno.id }) : undefined} />}
        painelComplementar={(
          <AproveitamentoPainel
            aproveitamento={aproveitamento}
            geradoEm={dados?.geradoEm ?? new Date().toISOString()}
            podeExportar={filtrado.atribuicoes.some((item) => item.alunos?.length)}
            onExportar={() => baixarCsv(gerarCsvAlunos(filtrado.atribuicoes), `alunos-${periodo?.codigo ?? "periodo"}.csv`)}
            onRelatorios={() => navigate("/relatorios/lista")}
          />
        )}
        painelEvolucao={(
          <PendenciasLancamentoPainel
            pendencias={pendencias}
            onLancarNotas={() => navigate("/notas/lancamento")}
            onRegistrarPresenca={() => navigate("/frequencias/lista")}
          />
        )}
        painelAcoes={(
          <MinhasTurmasPainel
            atribuicoes={filtrado.atribuicoes}
            ofertasComPendencia={ofertasComPendencia}
            carregandoDetalhe={carregandoDetalhe}
            onAbrir={(item) => void abrirDetalhe(item)}
            onAvaliacoes={() => navigate("/avaliacoes/lista")}
          />
        )}
        rodape={(
          <DashboardRodape
            status={horarioAtualizacao ? `Atualizado às ${horarioAtualizacao}` : "Dados atualizados agora"}
            onAtualizar={() => void carregar(periodo?.id, true)}
            atualizando={recarregando}
          />
        )}
      />
      <TurmaDetalhesDrawer
        detalhe={detalhe}
        onFechar={() => setDetalhe(null)}
        onAbrirAluno={(turmaDisciplinaId, alunoId) => { setDetalhe(null); void abrirAluno(turmaDisciplinaId, alunoId); }}
        onLancarNotas={() => navigate("/notas/lancamento")}
        onRegistrarFrequencia={() => navigate("/frequencias/lista")}
      />
      <AlunoDetalhesDrawer open={alunoAberto} carregando={carregandoAluno} erro={erroAluno} detalhe={detalheAluno} onClose={() => setAlunoAberto(false)} onLancarNotas={() => navigate("/notas/lancamento")} onRegistrarFrequencia={() => navigate("/frequencias/lista")} />
    </>
  );
}
