import { useEffect, useState } from "react";
import { Alert, IconButton, Stack, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Container from "../../components/Container";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import DataTable from "../../components/DataTable/DataTable";
import Button from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { usePeriodoLetivo } from "../../hooks/use-periodo-letivo";
import type { PeriodoLetivoResponse, PeriodoLetivoView } from "../../models/periodo-letivo-model";

export default function PeriodosLetivos() {
  const navigate = useNavigate();
  const { listarPeriodosLetivos, removerPeriodoLetivo, carregando } = usePeriodoLetivo();
  const [periodos, setPeriodos] = useState<PeriodoLetivoView[]>([]);
  const [registroExclusao, setRegistroExclusao] = useState<PeriodoLetivoView | null>(null);
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null);

  async function carregarPeriodos() {
    const data = await listarPeriodosLetivos();
    const periodosMapeados = data.map((periodo: PeriodoLetivoResponse) => ({
      id: periodo.id,
      codigo: periodo.codigo,
      semestre: `${periodo.ano}.${periodo.semestre}`,
      inicio: periodo.data_inicio?.slice(0, 10) ?? "",
      fim: periodo.data_fim?.slice(0, 10) ?? "",
      status: periodo.status,
      ativo: periodo.ativo,
    }));
    setPeriodos(periodosMapeados);
  }

  useEffect(() => {
    void (async () => {
      await carregarPeriodos();
    })();
  }, []);

  async function confirmarExclusao() {
    if (!registroExclusao) {
      return;
    }

    try {
      await removerPeriodoLetivo(registroExclusao.id);
      setAlerta({ tipo: "success", mensagem: "Periodo letivo removido com sucesso!" });
      setRegistroExclusao(null);
      void carregarPeriodos();
    } catch {
      setAlerta({ tipo: "error", mensagem: "Nao foi possivel remover o periodo letivo." });
    }
  }

  const columns: GridColDef<PeriodoLetivoView>[] = [
    { field: "codigo", headerName: "Codigo", width: 140 },
    { field: "semestre", headerName: "Ano/Semestre", width: 160 },
    { field: "inicio", headerName: "Inicio", width: 140 },
    { field: "fim", headerName: "Fim", width: 140 },
    { field: "status", headerName: "Status", width: 130 },
    {
      field: "acoes",
      headerName: "Acoes",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => navigate(`/periodos-letivos/${params.row.id}`)} color="primary">
            <Pencil size={18} />
          </IconButton>
          <IconButton onClick={() => setRegistroExclusao(params.row)} color="error">
            <Trash2 size={18} />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Container>
      <Stack gap={2}>
        <SearchTextField addPath="/periodos-letivos/cadastro" placeholder="Pesquisar Periodos Letivos" showFilters={false}>
          Periodos Letivos
        </SearchTextField>

        {alerta && <Alert severity={alerta.tipo}>{alerta.mensagem}</Alert>}

        <DataTable columns={columns} rows={periodos} loading={carregando} />
      </Stack>

      <Dialog.Root open={!!registroExclusao} onClose={() => setRegistroExclusao(null)} maxWidth="xs">
        <Dialog.Header>
          <Dialog.Title>Excluir periodo letivo</Dialog.Title>
          <Dialog.ActionClose onClose={() => setRegistroExclusao(null)} />
        </Dialog.Header>
        <Dialog.Content>
          <Typography>
            Deseja realmente excluir o periodo letivo {registroExclusao?.codigo}?
          </Typography>
        </Dialog.Content>
        <Dialog.Footer>
          <Button variant="outlined" onClick={() => setRegistroExclusao(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarExclusao}>Excluir</Button>
        </Dialog.Footer>
      </Dialog.Root>
    </Container>
  );
}
