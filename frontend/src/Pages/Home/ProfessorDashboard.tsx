import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button } from "@mui/material";
import { AlertTriangle, BookOpen, ClipboardX, Users } from "lucide-react";
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

  const indicadores: IndicadorDashboard[] = [
    {
      id: "turmas",
      titulo: "Turmas ativas",
      icone: Users,
      valor: String(resumo.turmas),
      apoio: periodo ? `Período ${periodo.ativo ? "ativo" : "encerrado"}` : "Sem período letivo",
    },
    {
      id: "disciplinas",
      titulo: "Disciplinas vinculadas",
      icone: BookOpen,
      valor: String(resumo.disciplinas),
      // Só mostra as ofertas quando o número difere do de disciplinas (senão repete o valor).
      complemento: resumo.ofertas !== resumo.disciplinas ? { texto: `em ${plural(resumo.ofertas, "oferta", "ofertas")}`, tom: "neutro" } : undefined,
      apoio: resumirNomes(resumo.nomesDisciplinas) || "Nenhuma disciplina vinculada",
    },
    {
      id: "atencao",
      titulo: "Alunos em atenção",
      icone: AlertTriangle,
      tom: resumo.possuiCritico ? "error" : resumo.alunosEmAtencao ? "warning" : "success",
      valor: String(resumo.alunosEmAtencao),
      destaque: resumo.percentualAtencao !== null && resumo.alunosEmAtencao ? fmtPct(resumo.percentualAtencao, 0) : undefined,
      apoio: `de ${plural(resumo.alunosUnicos, "aluno", "alunos")}${resumo.alunosCriticos ? ` · ${resumo.alunosCriticos} em risco alto` : ""}`,
    },
    {
      id: "notas",
      titulo: "Notas faltantes",
      icone: ClipboardX,
      tom: resumo.notasFaltantes ? "error" : "success",
      valor: String(resumo.notasFaltantes),
      apoio: resumo.avaliacoesComNotasFaltantes
        ? `em ${plural(resumo.avaliacoesComNotasFaltantes, "avaliação vencida", "avaliações vencidas")}`
        : "Nenhum lançamento atrasado",
    },
  ];

  return (
    <>
      <DashboardLayout
        carregando={carregando}
        nome={dados?.professor.nome || userName}
        seloNome="Docente"
        contexto={`${plural(resumo.alunosUnicos, "aluno vinculado", "alunos vinculados")} em ${plural(resumo.turmas, "turma", "turmas")}${filtroAtivo ? " (filtro aplicado)" : ""}`}
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
            status="Com base nas notas e frequências lançadas"
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
