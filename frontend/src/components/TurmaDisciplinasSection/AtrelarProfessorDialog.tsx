import { useEffect, useMemo, useState } from "react";
import { Alert, List, ListItemButton, ListItemIcon, ListItemText, Radio, Stack, Typography } from "@mui/material";
import { UserPlus } from "lucide-react";
import Button from "../Button";
import { Dialog } from "../Dialog";
import TextField from "../TextField";
import Cadastro from "../../Pages/Professores/Cadastro";
import { professorApi } from "../../services/professor-api";
import type { ProfessorOpcao } from "../../models/professor-model";

type Props = {
  open: boolean
  disciplina: { id: string; codigo: string; nome: string } | null
  professores: ProfessorOpcao[]
  onClose: () => void
  // Chamado com o professor ja habilitado na disciplina, pronto para ser atribuido a turma.
  onAtrelado: (professorId: string) => void
}

function mensagemErro(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { mensagem?: string; error?: string } } };
  return apiError.response?.data?.mensagem || apiError.response?.data?.error || fallback;
}

export function AtrelarProfessorDialog({ open, disciplina, professores, onClose, onAtrelado }: Props) {
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cadastroAberto, setCadastroAberto] = useState(false);

  useEffect(() => {
    if (open) {
      setBusca("");
      setSelecionadoId("");
      setErro(null);
      setCadastroAberto(false);
    }
  }, [open]);

  // Quem ja leciona a disciplina aparece direto no campo Professor; aqui so entra quem ainda nao leciona.
  const candidatos = useMemo(() => {
    if (!disciplina) {
      return [];
    }

    const termo = busca.trim().toLowerCase();
    return professores.filter((professor) =>
      !professor.disciplinas.some((item) => item.id === disciplina.id)
      && (!termo || professor.nome.toLowerCase().includes(termo))
    );
  }, [professores, disciplina, busca]);

  async function atrelar(professorId: string) {
    if (!disciplina) {
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      await professorApi.vincularDisciplina(professorId, disciplina.id);
      onAtrelado(professorId);
    } catch (error) {
      // Volta para a lista para o erro ficar visivel, inclusive quando vem do cadastro.
      setCadastroAberto(false);
      setErro(mensagemErro(error, "Nao foi possivel atrelar o professor a disciplina."));
    } finally {
      setSalvando(false);
    }
  }

  if (!disciplina) {
    return null;
  }

  return (
    <>
      <Dialog.Root open={open && !cadastroAberto} onClose={onClose} maxWidth="sm">
        <Dialog.Header>
          <Dialog.Title>Atrelar professor</Dialog.Title>
          <Dialog.ActionClose onClose={onClose} />
        </Dialog.Header>
        <Dialog.Content>
          <Stack gap={2}>
            <Typography variant="body2" color="text.secondary">
              Marque o professor que passara a lecionar {disciplina.codigo} - {disciplina.nome}. A disciplina sera
              adicionada ao cadastro dele e ele ja ficara selecionado nesta oferta.
            </Typography>
            {erro && <Alert severity="error" onClose={() => setErro(null)}>{erro}</Alert>}
            <TextField label="Pesquisar professor" value={busca} onChange={(e) => setBusca(e.target.value)} />
            {candidatos.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {busca
                  ? "Nenhum professor encontrado com esse nome."
                  : "Todos os professores ativos ja lecionam esta disciplina."}
              </Typography>
            ) : (
              <List dense sx={{ maxHeight: 280, overflowY: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
                {candidatos.map((professor) => (
                  <ListItemButton key={professor.id} onClick={() => setSelecionadoId(professor.id)} selected={selecionadoId === professor.id}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Radio edge="start" size="small" checked={selecionadoId === professor.id} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText
                      primary={professor.nome}
                      secondary={professor.disciplinas.length
                        ? `Leciona: ${professor.disciplinas.map((item) => item.nome).join(", ")}`
                        : "Nenhuma disciplina cadastrada"}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">Professor ainda nao cadastrado?</Typography>
              <Button variant="text" startIcon={<UserPlus size={16} />} onClick={() => setCadastroAberto(true)} sx={{ width: "auto" }}>
                Cadastrar novo professor
              </Button>
            </Stack>
          </Stack>
        </Dialog.Content>
        <Dialog.Footer>
          <Button variant="outlined" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button variant="contained" onClick={() => void atrelar(selecionadoId)} disabled={!selecionadoId} isLoading={salvando}>
            Atrelar
          </Button>
        </Dialog.Footer>
      </Dialog.Root>

      <Dialog.Root open={open && cadastroAberto} onClose={() => setCadastroAberto(false)} maxWidth="md">
        <Dialog.Header>
          <Dialog.Title>Novo professor para {disciplina.nome}</Dialog.Title>
          <Dialog.ActionClose onClose={() => setCadastroAberto(false)} />
        </Dialog.Header>
        <Dialog.Content>
          {open && cadastroAberto && (
            <Cadastro
              disciplinaInicial={{ id: disciplina.id, nome: disciplina.nome }}
              onCancelar={() => setCadastroAberto(false)}
              // Garante o vinculo mesmo que a disciplina tenha sido desmarcada no formulario.
              onConcluido={(professor) => void atrelar(professor.id)}
            />
          )}
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
