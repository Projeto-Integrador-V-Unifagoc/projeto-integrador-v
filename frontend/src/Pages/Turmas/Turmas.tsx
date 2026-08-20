import { useEffect, useState } from "react";
import { Alert, IconButton, Stack, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Container from "../../components/Container";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import DataTable from "../../components/DataTable/DataTable";
import Button from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { useTurma } from "../../hooks/use-turma";
import type { TurmaResponse } from "../../models/turma-model";

type TurmaView = {
  id: string
  sigla: string
  descricao: string
  curso: string
  periodoLetivo: string
  periodoCurricular: number
  capacidadeAlunos: number
  turno: string
  status: string
}

export default function Turmas() {
  const navigate = useNavigate();
  const { listarTurmas, removerTurma, carregando } = useTurma();
  const [turmas, setTurmas] = useState<TurmaView[]>([]);
  const [registroExclusao, setRegistroExclusao] = useState<TurmaView | null>(null);
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null);

  async function carregarTurmas() {
    const data = await listarTurmas();
    const turmasMapeadas = data.map((turma: TurmaResponse) => ({
      id: turma.id,
      sigla: turma.sigla,
      descricao: turma.descricao,
      curso: turma.curso.nome,
      periodoLetivo: turma.periodo_letivo.codigo,
      periodoCurricular: turma.periodo_curricular,
      capacidadeAlunos: turma.capacidade_alunos,
      turno: turma.turno,
      status: turma.status,
    }));
    setTurmas(turmasMapeadas);
  }

  useEffect(() => {
    void (async () => {
      await carregarTurmas();
    })();
  }, []);

  async function confirmarExclusao() {
    if (!registroExclusao) {
      return;
    }

    try {
      await removerTurma(registroExclusao.id);
      setAlerta({ tipo: "success", mensagem: "Turma removida com sucesso!" });
      setRegistroExclusao(null);
      void carregarTurmas();
    } catch {
      setAlerta({ tipo: "error", mensagem: "Nao foi possivel remover a turma." });
    }
  }

  const columns: GridColDef<TurmaView>[] = [
    { field: "sigla", headerName: "Sigla", width: 120 },
    { field: "descricao", headerName: "Descricao", flex: 1 },
    { field: "curso", headerName: "Curso", flex: 1 },
    { field: "periodoLetivo", headerName: "Periodo Letivo", width: 160 },
    { field: "turno", headerName: "Turno", width: 130 },
    { field: "status", headerName: "Status", width: 120 },
    {
      field: "acoes",
      headerName: "Acoes",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => navigate(`/turmas/${params.row.id}`)} color="primary">
            <Eye size={18} />
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
        <SearchTextField addPath="/turmas/cadastro" placeholder="Pesquisar Turmas" showFilters={false}>
          Turmas
        </SearchTextField>

        {alerta && <Alert severity={alerta.tipo}>{alerta.mensagem}</Alert>}

        <DataTable columns={columns} rows={turmas} loading={carregando} />
      </Stack>

      <Dialog.Root open={!!registroExclusao} onClose={() => setRegistroExclusao(null)} maxWidth="xs">
        <Dialog.Header>
          <Dialog.Title>Excluir turma</Dialog.Title>
          <Dialog.ActionClose onClose={() => setRegistroExclusao(null)} />
        </Dialog.Header>
        <Dialog.Content>
          <Typography>
            Deseja realmente excluir a turma {registroExclusao?.sigla}?
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
