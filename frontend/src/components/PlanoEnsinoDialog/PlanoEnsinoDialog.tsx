import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Chip, Grid, MenuItem, Stack } from "@mui/material";
import Button from "../Button";
import TextField from "../TextField";
import { Dialog } from "../Dialog";
import type { ConteudoPlanoEnsino, PlanoEnsinoResponse } from "../../models/plano-ensino-model";
import { planoEnsinoApi } from "../../services/plano-ensino-api";

const vazio: ConteudoPlanoEnsino = { temaApresentacao: "", objetivoGeral: "", objetivosEspecificos: "", metodologia: "", conhecimentosHabilidadesAtitudes: "", bibliografiaBasica: "", bibliografiaComplementar: "", estrategiasPedagogicas: "", programaAvaliacao: "", recursosDidaticos: "", cronograma: "", observacoes: "" };
const campos: Array<{ chave: keyof ConteudoPlanoEnsino; rotulo: string; obrigatorio?: boolean; linhas?: number }> = [
  { chave: "temaApresentacao", rotulo: "Tema e apresentação" }, { chave: "objetivoGeral", rotulo: "Objetivo geral", obrigatorio: true },
  { chave: "objetivosEspecificos", rotulo: "Objetivos específicos", obrigatorio: true }, { chave: "metodologia", rotulo: "Metodologia", obrigatorio: true },
  { chave: "conhecimentosHabilidadesAtitudes", rotulo: "Conhecimentos, habilidades e atitudes" }, { chave: "estrategiasPedagogicas", rotulo: "Estratégias pedagógicas" },
  { chave: "programaAvaliacao", rotulo: "Programa de avaliação", obrigatorio: true }, { chave: "recursosDidaticos", rotulo: "Recursos didáticos" },
  { chave: "bibliografiaBasica", rotulo: "Bibliografia básica", obrigatorio: true }, { chave: "bibliografiaComplementar", rotulo: "Bibliografia complementar" },
  { chave: "cronograma", rotulo: "Cronograma planejado", obrigatorio: true, linhas: 5 }, { chave: "observacoes", rotulo: "Observações" },
];
const mensagem = (e: unknown) => axios.isAxiosError(e) ? e.response?.data?.error ?? "Não foi possível concluir a operação." : "Não foi possível concluir a operação.";
const perfilAdmin = () => { try { const p = JSON.parse(localStorage.getItem("@UniEduca:user") ?? "{}").tipo_usuario; return p === "secretaria" || p === "administrador"; } catch { return false; } };

export type OfertaPlanoEnsino = { id: string; curso_disciplina: { disciplina: { codigo: string; nome: string } } };

export function PlanoEnsinoDialog({ open, oferta, onClose }: { open: boolean; oferta: OfertaPlanoEnsino | null; onClose: () => void }) {
  const [planos, setPlanos] = useState<PlanoEnsinoResponse[]>([]); const [selecionado, setSelecionado] = useState("");
  const [form, setForm] = useState<ConteudoPlanoEnsino>(vazio); const [carregando, setCarregando] = useState(false); const [erro, setErro] = useState(""); const [sucesso, setSucesso] = useState("");
  const plano = planos.find((p) => p.id === selecionado) ?? planos[0] ?? null; const editavel = plano?.status === "RASCUNHO";
  async function carregar(preferir?: string) { if (!oferta) return; setCarregando(true); try { const lista = await planoEnsinoApi.listar(oferta.id); setPlanos(lista); const id = preferir ?? lista[0]?.id ?? ""; setSelecionado(id); const atual = lista.find((p) => p.id === id) ?? lista[0]; setForm({ ...vazio, ...(atual?.conteudo ?? {}) }); setErro(""); } catch (e) { setErro(mensagem(e)); } finally { setCarregando(false); } }
  useEffect(() => { if (open && oferta) { setSucesso(""); void carregar(); } }, [open, oferta?.id]);
  async function executar(acao: () => Promise<PlanoEnsinoResponse>, texto: string) { setCarregando(true); setErro(""); try { const r = await acao(); setSucesso(texto); await carregar(r.id); } catch (e) { setErro(mensagem(e)); setCarregando(false); } }
  async function criar() { await executar(() => planoEnsinoApi.criar(oferta!.id), "Nova versão criada em rascunho."); }
  return <Dialog.Root open={open} onClose={onClose} maxWidth="lg"><Dialog.Header><Dialog.Title>Plano de ensino · {oferta?.curso_disciplina.disciplina.codigo} · {oferta?.curso_disciplina.disciplina.nome}</Dialog.Title><Dialog.ActionClose onClose={onClose} /></Dialog.Header><Dialog.Content><Stack gap={2}>
    {erro && <Alert severity="error">{erro}</Alert>}{sucesso && <Alert severity="success">{sucesso}</Alert>}
    {!planos.length && !carregando ? <Alert severity="info" action={<Button color="inherit" onClick={() => void criar()} sx={{ width: "auto", whiteSpace: "nowrap" }}>Criar plano</Button>}>Esta oferta ainda não possui plano de ensino.</Alert> : <>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}><TextField select label="Versão" value={plano?.id ?? ""} onChange={(e) => { const p = planos.find((x) => x.id === e.target.value); setSelecionado(e.target.value); setForm({ ...vazio, ...(p?.conteudo ?? {}) }); }} sx={{ maxWidth: 260 }}>{planos.map((p) => <MenuItem key={p.id} value={p.id}>Versão {p.versao} · {p.status}</MenuItem>)}</TextField>{plano && <Stack direction="row" gap={1} alignItems="center"><Chip color={plano.status === "APROVADO" ? "success" : plano.status === "SUBMETIDO" ? "warning" : plano.status === "RASCUNHO" ? "info" : "default"} label={plano.status} />{!planos.some((p) => p.status === "RASCUNHO" || p.status === "SUBMETIDO") && <Button variant="outlined" onClick={() => void criar()} sx={{ width: "auto" }}>Nova versão</Button>}</Stack>}</Stack>
      {plano?.status === "APROVADO" && <Alert severity="success">Versão aprovada com snapshot de {plano.snapshot_competencias?.length ?? 0} competências e da ementa vigente no momento da aprovação.</Alert>}
      <Grid container spacing={1.5}>{campos.map((campo) => <Grid key={campo.chave} size={{ xs: 12, md: campo.chave === "cronograma" ? 12 : 6 }}><TextField fullWidth multiline minRows={campo.linhas ?? 3} required={campo.obrigatorio} label={campo.rotulo} value={form[campo.chave]} disabled={!editavel} onChange={(e) => setForm((f) => ({ ...f, [campo.chave]: e.target.value }))} /></Grid>)}</Grid>
    </>}
  </Stack></Dialog.Content><Dialog.Footer><Button variant="outlined" onClick={onClose}>Fechar</Button>{plano && editavel && <Button variant="outlined" onClick={() => void executar(() => planoEnsinoApi.atualizar(plano.id, form), "Rascunho salvo.")} isLoading={carregando}>Salvar rascunho</Button>}{plano && editavel && <Button variant="contained" onClick={() => void executar(async () => { await planoEnsinoApi.atualizar(plano.id, form); return planoEnsinoApi.submeter(plano.id); }, "Plano submetido para aprovação.")} isLoading={carregando}>Salvar e submeter</Button>}{plano?.status === "SUBMETIDO" && perfilAdmin() && <Button variant="contained" color="success" onClick={() => void executar(() => planoEnsinoApi.aprovar(plano.id), "Plano aprovado e snapshot acadêmico preservado.")} isLoading={carregando}>Aprovar</Button>}{plano && plano.status !== "ARQUIVADO" && perfilAdmin() && <Button variant="outlined" color="error" onClick={() => void executar(() => planoEnsinoApi.arquivar(plano.id), "Plano arquivado.")} isLoading={carregando}>Arquivar</Button>}</Dialog.Footer></Dialog.Root>;
}
