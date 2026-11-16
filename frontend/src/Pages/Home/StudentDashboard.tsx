import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "@mui/material";
import { AlertTriangle, CalendarClock, TrendingUp, UserRoundCheck } from "lucide-react";
import { perguntarAoAssistente, useAssistenteDisponivel } from "../../components/AssistenteWidget/ponte";
import { AssistenteIaCaixa, DashboardLayout, DashboardRodape } from "../../components/DashboardLayout";
import type { AlertaIndicador, IndicadorDashboard } from "../../components/DashboardLayout";
import type { MinhaFrequenciaAluno } from "../../models/frequencia-model";
import type { DisciplinaAluno, TarefaAluno } from "../../models/home-aluno-model";
import type { BoletimAluno } from "../../models/nota-model";
import { authService } from "../../services/auth-services";
import { frequenciaApi } from "../../services/frequencia-api";
import { homeAlunoApi } from "../../services/home-aluno-api";
import { notaApi } from "../../services/nota-api";
import DisciplinaDetalhesDrawer from "./DisciplinaDetalhesDrawer";
import AcessosRapidosAluno from "./aluno/AcessosRapidosAluno";
import AvaliacoesCadastradasPainel from "./aluno/AvaliacoesCadastradasPainel";
import PontosAtencaoPainel from "./aluno/PontosAtencaoPainel";
import TabelaDisciplinasAluno from "./aluno/TabelaDisciplinasAluno";
import {
  JANELA_DEVOLUCAO_DIAS,
  MEDIA_CRITICA,
  MEDIA_REFERENCIA,
  fmtPct,
  gerarPontosAtencao,
  listarAvaliacoesPainel,
  montarDisciplinasAluno,
  resumoAtencao,
  resumoDevolucoes,
  resumoFrequencia,
  resumoMedia,
  resumirNomes,
} from "./aluno/regras-dashboard-aluno";

interface StudentDashboardProps { userName: string }

interface InformacaoAluno {
  matricula: string | number | null;
  curso: string | null;
  periodo: string | number | null;
}

interface RespostaMe {
  data?: { academico?: InformacaoAluno | null };
}

const fmtNumero = (valor: number, casas = 1) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor);
const plural = (quantidade: number, singular: string, pluralTexto: string) => `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;

export default function StudentDashboard({ userName }: StudentDashboardProps) {
  const navigate = useNavigate();
  // Assistente do sistema (widget do MainLayout). Indisponível = botões e caixa ficam visíveis, mas inertes.
  const iaDisponivel = useAssistenteDisponivel();
  const [studentInfo, setStudentInfo] = useState<InformacaoAluno | null>(null);
  const [disciplinas, setDisciplinas] = useState<DisciplinaAluno[]>([]);
  const [tarefas, setTarefas] = useState<TarefaAluno[]>([]);
  const [frequencia, setFrequencia] = useState<MinhaFrequenciaAluno | null>(null);
  const [boletim, setBoletim] = useState<BoletimAluno | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [horarioAtualizacao, setHorarioAtualizacao] = useState("");
  const [disciplinaSelecionadaId, setDisciplinaSelecionadaId] = useState<string | null>(null);

  const carregar = useCallback(async (atualizacao = false) => {
    if (atualizacao) setRecarregando(true);
    const token = localStorage.getItem("@UniEduca:token") ?? "";
    const resultados = await Promise.allSettled([
      authService.getMe(token) as Promise<RespostaMe>,
      homeAlunoApi.minhasDisciplinas(),
      homeAlunoApi.minhasTarefas(),
      frequenciaApi.minhaFrequencia(),
      notaApi.meuBoletim(),
    ]);
    const [me, listaDisciplinas, listaTarefas, dadosFrequencia, dadosBoletim] = resultados;
    const falhas: string[] = [];

    if (me.status === "fulfilled") setStudentInfo(me.value.data?.academico ?? null); else falhas.push("dados do curso");
    if (listaDisciplinas.status === "fulfilled") setDisciplinas(listaDisciplinas.value); else falhas.push("disciplinas");
    if (listaTarefas.status === "fulfilled") setTarefas(listaTarefas.value); else falhas.push("agenda");
    if (dadosFrequencia.status === "fulfilled") setFrequencia(dadosFrequencia.value); else falhas.push("frequência");
    if (dadosBoletim.status === "fulfilled") setBoletim(dadosBoletim.value); else falhas.push("notas");

    setErros(falhas);
    setHorarioAtualizacao(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    setCarregando(false);
    setRecarregando(false);
  }, []);

  useEffect(() => {
    // O carregamento sincroniza a tela com cinco fontes externas; as respostas
    // atualizam os estados somente depois que as requisições são concluídas.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  const lista = useMemo(() => montarDisciplinasAluno(disciplinas, boletim, frequencia), [disciplinas, boletim, frequencia]);
  const avaliacoes = useMemo(() => listarAvaliacoesPainel(boletim), [boletim]);
  const pontos = useMemo(() => gerarPontosAtencao(lista, avaliacoes), [lista, avaliacoes]);
  const media = resumoMedia(lista);
  const freq = resumoFrequencia(lista);
  const atencao = resumoAtencao(lista);
  const devolucoes = resumoDevolucoes(avaliacoes);
  const periodoCodigo = disciplinas[0]?.periodoLetivo.codigo ?? null;

  const disciplinaSelecionada = disciplinas.find((item) => item.turmaDisciplinaId === disciplinaSelecionadaId) ?? null;
  const boletimSelecionado = boletim?.disciplinas.find((item) => item.turmaDisciplinaId === disciplinaSelecionadaId) ?? null;
  const frequenciaSelecionada = frequencia?.consolidado.find((item) => item.turmaDisciplinaId === disciplinaSelecionadaId) ?? null;

  // Resumo acionável (o que pede atenção agora), no lugar de dados cadastrais que já estão no perfil.
  const pendencias = [
    atencao.emAtencao.length ? plural(atencao.emAtencao.length, "disciplina em atenção", "disciplinas em atenção") : null,
    devolucoes.vencidas.length ? plural(devolucoes.vencidas.length, "devolução atrasada", "devoluções atrasadas") : null,
  ].filter(Boolean);
  const contexto = pendencias.length
    ? pendencias.join(" · ")
    : lista.some((item) => item.nivel !== "sem-dados") ? "Tudo em dia nas suas disciplinas." : "Resumo acadêmico do seu período atual.";

  const piorDisciplina = atencao.emAtencao[0];
  const sugestoes = ["Como está minha frequência?", ...(piorDisciplina ? [`Por que ${piorDisciplina.nome} está em atenção?`] : [])];

  // Cor só quando o KPI pede ação; o resto fica neutro. Mesmos limites da regra de risco.
  const alertaMedia: AlertaIndicador | undefined = media.media === null ? undefined : media.media < MEDIA_CRITICA ? "critico" : media.media < MEDIA_REFERENCIA ? "atencao" : undefined;
  const alertaFrequencia: AlertaIndicador | undefined = freq.situacao === "abaixo" ? "critico" : freq.situacao === "atencao" ? "atencao" : undefined;

  const indicadores: IndicadorDashboard[] = [
    {
      id: "media",
      titulo: "Média parcial",
      icone: TrendingUp,
      alerta: alertaMedia,
      valor: fmtPct(media.media, 1),
      complemento: media.escala10 !== null ? `${fmtNumero(media.escala10)} / 10` : undefined,
      apoio: media.disciplinasComNota
        ? `em ${plural(media.disciplinasComNota, "disciplina", "disciplinas")} com nota`
        : "Aguardando as primeiras notas",
    },
    {
      id: "frequencia",
      titulo: "Frequência",
      icone: UserRoundCheck,
      alerta: alertaFrequencia,
      valor: fmtPct(freq.percentual, 1),
      apoio: `${plural(freq.presencas, "presença", "presenças")} · ${plural(freq.faltas, "falta", "faltas")}`,
    },
    {
      id: "atencao",
      titulo: "Disciplinas em atenção",
      icone: AlertTriangle,
      alerta: atencao.piorNivel === "alto" ? "critico" : atencao.piorNivel === "medio" ? "atencao" : undefined,
      valor: String(atencao.emAtencao.length),
      apoio: atencao.emAtencao.length
        ? resumirNomes(atencao.emAtencao.map((item) => item.nome))
        : lista.some((item) => item.nivel !== "sem-dados") ? "Todas dentro das metas" : "Aguardando lançamentos",
    },
    {
      id: "devolucoes",
      titulo: "Devoluções próximas",
      icone: CalendarClock,
      valor: String(devolucoes.proximas.length),
      complemento: `em ${JANELA_DEVOLUCAO_DIAS} dias`,
      apoio: devolucoes.vencidas.length
        ? `${plural(devolucoes.vencidas.length, "vencida", "vencidas")} sem nota`
        : "Nenhuma vencida sem nota",
    },
  ];

  return (
    <>
      <DashboardLayout
        carregando={carregando}
        nome={userName}
        seloData={[studentInfo?.curso, periodoCodigo ? `Período ${periodoCodigo}` : null].filter(Boolean).join(" · ") || undefined}
        contexto={contexto}
        assistente={<AssistenteIaCaixa placeholder="Pergunte sobre suas notas e frequência…" sugestoes={sugestoes} onEnviar={iaDisponivel ? (pergunta) => perguntarAoAssistente(pergunta) : undefined} />}
        avisos={erros.length > 0 ? <Alert severity="warning">Alguns dados não puderam ser atualizados: {erros.join(", ")}. Os demais indicadores continuam disponíveis.</Alert> : undefined}
        indicadores={indicadores}
        painelPrincipal={(
          <TabelaDisciplinasAluno
            disciplinas={lista}
            onDetalhes={setDisciplinaSelecionadaId}
            onBoletim={() => navigate("/minhas-notas")}
            onEntender={iaDisponivel ? (disciplina) => perguntarAoAssistente(`Entender meu desempenho em ${disciplina.nome}`, { tipo: "entender_desempenho", turmaDisciplinaId: disciplina.turmaDisciplinaId }) : undefined}
          />
        )}
        painelComplementar={(
          <AvaliacoesCadastradasPainel avaliacoes={avaliacoes} resumo={devolucoes} onConsultar={() => navigate("/minha-agenda")} onAbrirDisciplina={setDisciplinaSelecionadaId} />
        )}
        painelEvolucao={<PontosAtencaoPainel pontos={pontos} onVerDetalhes={setDisciplinaSelecionadaId} />}
        painelAcoes={<AcessosRapidosAluno navegar={navigate} onOrientacoesIa={iaDisponivel ? () => perguntarAoAssistente("Quais devem ser minhas prioridades acadêmicas agora?", { tipo: "orientacoes" }) : undefined} />}
        rodape={(
          <DashboardRodape
            status={`Atualizado às ${horarioAtualizacao}`}
            onAtualizar={() => void carregar(true)}
            atualizando={recarregando}
          />
        )}
      />
      <DisciplinaDetalhesDrawer
        aberto={disciplinaSelecionada !== null}
        disciplina={disciplinaSelecionada}
        boletim={boletimSelecionado}
        frequencia={frequenciaSelecionada}
        tarefas={tarefas}
        onFechar={() => setDisciplinaSelecionadaId(null)}
        onAbrirBoletim={() => navigate("/minhas-notas")}
        onAbrirFrequencia={() => navigate("/minha-frequencia")}
      />
    </>
  );
}
