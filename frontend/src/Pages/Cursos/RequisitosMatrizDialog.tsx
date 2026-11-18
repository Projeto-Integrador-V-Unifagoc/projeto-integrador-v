import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Alert, Chip, Grid, IconButton, MenuItem, Stack, Typography } from "@mui/material";
import { Trash2 } from "lucide-react";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import { Dialog } from "../../components/Dialog";
import type { CursoDisciplinaResponse, RequisitoCurricularResponse, TipoRequisitoCurricular } from "../../models/curso-disciplina-model";

export default function RequisitosMatrizDialog({ open, item, matriz, requisitos, editavel, onClose, onAdicionar, onAtualizar, onRemover }: {
  open: boolean;
  item: CursoDisciplinaResponse | null;
  matriz: CursoDisciplinaResponse[];
  requisitos: RequisitoCurricularResponse[];
  editavel: boolean;
  onClose: () => void;
  onAdicionar: (requisitoCursoDisciplinaId: string, tipo: TipoRequisitoCurricular) => Promise<void>;
  onAtualizar: (id: string, tipo: TipoRequisitoCurricular) => Promise<void>;
  onRemover: (id: string) => Promise<void>;
}) {
  const [requisitoId, setRequisitoId] = useState("");
  const [tipo, setTipo] = useState<TipoRequisitoCurricular>("OBRIGATORIO");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [requisitoExclusao, setRequisitoExclusao] = useState<RequisitoCurricularResponse | null>(null);
  const vinculados = useMemo(() => requisitos.filter((requisito) => requisito.cursoDisciplinaId === item?.id), [requisitos, item]);
  const disponiveis = useMemo(() => {
    const ids = new Set(vinculados.map((requisito) => requisito.requisito.cursoDisciplinaId));
    return matriz.filter((candidato) => candidato.id !== item?.id && !ids.has(candidato.id));
  }, [matriz, item, vinculados]);

  useEffect(() => { if (open) { setRequisitoId(""); setTipo("OBRIGATORIO"); setErro(""); setRequisitoExclusao(null); } }, [open, item?.id]);

  async function adicionar() {
    if (!requisitoId) { setErro("Selecione uma disciplina como requisito."); return; }
    setSalvando(true); setErro("");
    try { await onAdicionar(requisitoId, tipo); setRequisitoId(""); }
    catch (error) { setErro(axios.isAxiosError(error) ? error.response?.data?.error ?? "Não foi possível adicionar o requisito." : "Não foi possível adicionar o requisito."); }
    finally { setSalvando(false); }
  }

  return <><Dialog.Root open={open} onClose={onClose} maxWidth="md"><Dialog.Header><Dialog.Title>Requisitos de {item?.disciplina.codigo} · {item?.disciplina.nome}</Dialog.Title><Dialog.ActionClose onClose={onClose} /></Dialog.Header><Dialog.Content><Stack gap={2}>
    {erro && <Alert severity="error">{erro}</Alert>}
    {item?.disciplina.pre_requisito && <Alert severity="info">Texto legado preservado: {item.disciplina.pre_requisito}</Alert>}
    <Stack gap={1}><Typography fontWeight={750}>Requisitos estruturados</Typography>{vinculados.length ? vinculados.map((requisito) => <Stack key={requisito.id} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}><Stack direction="row" alignItems="center" gap={1} flexWrap="wrap"><Typography variant="body2" fontWeight={700}>{requisito.requisito.codigo} · {requisito.requisito.nome}</Typography><Chip size="small" variant="outlined" label={requisito.requisito.periodoIdeal ? `${requisito.requisito.periodoIdeal}º período` : "Sem período"} /><TextField select size="small" value={requisito.tipo} disabled={!editavel} onChange={(e) => void onAtualizar(requisito.id, e.target.value as TipoRequisitoCurricular)} sx={{ minWidth: 150 }}><MenuItem value="OBRIGATORIO">Obrigatório</MenuItem><MenuItem value="RECOMENDADO">Recomendado</MenuItem></TextField></Stack>{editavel && <IconButton aria-label={`Remover requisito ${requisito.requisito.nome}`} color="error" onClick={() => setRequisitoExclusao(requisito)}><Trash2 size={18} /></IconButton>}</Stack>) : <Alert severity="info">Nenhum requisito estruturado foi definido para esta disciplina.</Alert>}</Stack>
    {editavel ? <Stack gap={1}><Typography fontWeight={750}>Adicionar requisito</Typography><Grid container spacing={1.5} alignItems="center"><Grid size={{ xs: 12, md: 7 }}><TextField select label="Disciplina da mesma matriz" value={requisitoId} onChange={(e) => setRequisitoId(e.target.value)}>{disponiveis.map((candidato) => <MenuItem key={candidato.id} value={candidato.id}>{candidato.disciplina.codigo} · {candidato.disciplina.nome}{candidato.periodo_ideal ? ` · ${candidato.periodo_ideal}º período` : ""}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 3 }}><TextField select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoRequisitoCurricular)}><MenuItem value="OBRIGATORIO">Obrigatório</MenuItem><MenuItem value="RECOMENDADO">Recomendado</MenuItem></TextField></Grid><Grid size={{ xs: 12, md: 2 }}><Button variant="contained" onClick={() => void adicionar()} isLoading={salvando} disabled={!disponiveis.length} sx={{ whiteSpace: "nowrap" }}>Adicionar</Button></Grid></Grid><Typography variant="caption" color="text.secondary">O sistema impede requisitos de outra versão, autorreferência e ciclos diretos ou indiretos.</Typography></Stack> : <Alert severity="info">Esta matriz está publicada e seus requisitos são somente leitura.</Alert>}
  </Stack></Dialog.Content><Dialog.Footer><Button variant="outlined" onClick={onClose}>Fechar</Button></Dialog.Footer></Dialog.Root>
  <Dialog.Root open={!!requisitoExclusao} onClose={() => setRequisitoExclusao(null)} maxWidth="xs"><Dialog.Header><Dialog.Title>Remover requisito</Dialog.Title><Dialog.ActionClose onClose={() => setRequisitoExclusao(null)} /></Dialog.Header><Dialog.Content><Typography>Deseja remover {requisitoExclusao?.requisito.codigo} · {requisitoExclusao?.requisito.nome} dos requisitos desta disciplina?</Typography></Dialog.Content><Dialog.Footer><Button variant="outlined" onClick={() => setRequisitoExclusao(null)}>Cancelar</Button><Button variant="contained" color="error" onClick={() => void (async () => { if (!requisitoExclusao) return; await onRemover(requisitoExclusao.id); setRequisitoExclusao(null); })()}>Remover</Button></Dialog.Footer></Dialog.Root></>;
}
