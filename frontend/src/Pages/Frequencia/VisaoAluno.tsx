import { useEffect, useMemo, useState } from "react";
import { Alert, Button } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { CalendarCheck } from "lucide-react";
import {
  AvisoDetalhe,
  DashboardPainel,
  PaginaCabecalho,
  PaginaPadrao,
  sxBotaoSecundario,
  sxTabelaDados,
} from "../../components/DashboardLayout";
import DataTable from "../../components/DataTable/DataTable";
import { useFrequencia } from "../../hooks/use-frequencia";
import { formatarDataPtBr } from "../../utils/avaliacao";
import type { ConsolidadoFrequencia, HistoricoFrequenciaAluno } from "../../models/frequencia-model";
import JustificativaDialog from "./JustificativaDialog";
import { colunasConsolidado, colunasHistorico } from "./frequencia-columns";
import { type Aviso, mensagemErro } from "./frequencia-utils";

export default function VisaoAluno() {
  const api = useFrequencia();
  const [consolidado, setConsolidado] = useState<ConsolidadoFrequencia[]>([]);
  const [historico, setHistorico] = useState<HistoricoFrequenciaAluno[]>([]);
  const [possuiAlerta, setPossuiAlerta] = useState(false);
  const [aviso, setAviso] = useState<Aviso>();
  const [justificar, setJustificar] = useState<HistoricoFrequenciaAluno | null>(null);
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const r = await api.minhaFrequencia();
        if (!ativo) return;
        setConsolidado(r.consolidado);
        setHistorico(r.historico);
        setPossuiAlerta(Boolean(r.possuiAlerta));
      } catch (e) {
        if (ativo) setAviso({ tipo: "error", texto: mensagemErro(e) });
      }
    })();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirJustificativa(registro: HistoricoFrequenciaAluno) {
    setJustificar(registro);
    setMotivo(registro.motivoJustificativa || "");
    setObservacao(registro.observacaoJustificativa || "");
  }

  async function salvarJustificativa() {
    if (!justificar || api.operacoes.justificativa) return;
    try {
      await api.justificar(justificar.id, { motivo, observacao, confirmarSubstituicao: Boolean(justificar.motivoJustificativa) });
      setJustificar(null);
      setAviso({ tipo: "success", texto: "Justificativa salva. A falta continua no cálculo da frequência." });
      const r = await api.minhaFrequencia();
      setConsolidado(r.consolidado);
      setHistorico(r.historico);
      setPossuiAlerta(Boolean(r.possuiAlerta));
    } catch (e) {
      setAviso({ tipo: "error", texto: mensagemErro(e) });
    }
  }

  const linhasConsolidado = useMemo(() => consolidado.map((x) => ({ ...x, id: x.turmaDisciplinaId })), [consolidado]);
  const colunasResumo = useMemo(() => colunasConsolidado(false), []);
  const colunasAulas = useMemo<GridColDef[]>(
    () =>
      colunasHistorico({
        field: "acao",
        headerName: "Ação",
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) =>
          row.status === "AUSENTE" ? (
            <Button
              size="small"
              sx={{ ...sxBotaoSecundario, height: 26 }}
              aria-label={`Justificar ausência de ${formatarDataPtBr(row.data)} em ${row.disciplinaNome}`}
              onClick={() => abrirJustificativa(row)}
            >
              Justificar
            </Button>
          ) : null,
      }),
    [],
  );

  const carregando = api.operacoes.consulta;

  return (
    <PaginaPadrao>
      <PaginaCabecalho titulo="Minha frequência" subtitulo="Frequência por disciplina e histórico aula a aula." icone={CalendarCheck} />

      {aviso && (
        <Alert severity={aviso.tipo} onClose={() => setAviso(undefined)}>
          {aviso.texto}
        </Alert>
      )}
      {possuiAlerta && (
        <AvisoDetalhe gravidade="media">
          Sua frequência está em 80% ou menos em pelo menos uma disciplina. Acompanhe seu desempenho.
        </AvisoDetalhe>
      )}

      <DashboardPainel titulo="Consolidado por disciplina" contador={linhasConsolidado.length || undefined}>
        <DataTable
          rows={linhasConsolidado}
          columns={colunasResumo}
          loading={carregando}
          emptyTitle="Nenhuma frequência lançada até o momento"
          emptyDescription="Assim que o professor registrar a chamada, sua frequência aparecerá aqui."
          sx={sxTabelaDados}
        />
      </DashboardPainel>

      <DashboardPainel titulo="Histórico aula a aula" contador={historico.length || undefined}>
        <DataTable
          rows={historico}
          columns={colunasAulas}
          loading={carregando}
          emptyTitle="Nenhuma aula encontrada no histórico"
          emptyDescription="As aulas registradas pelo professor aparecerão aqui."
          sx={sxTabelaDados}
        />
      </DashboardPainel>

      <JustificativaDialog
        open={Boolean(justificar)}
        substituindo={Boolean(justificar?.motivoJustificativa)}
        motivo={motivo}
        observacao={observacao}
        saving={api.operacoes.justificativa}
        onMotivo={setMotivo}
        onObservacao={setObservacao}
        onClose={() => setJustificar(null)}
        onSave={salvarJustificativa}
      />
    </PaginaPadrao>
  );
}
