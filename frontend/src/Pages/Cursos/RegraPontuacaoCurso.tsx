import { useEffect, useEffectEvent, useRef, useState } from "react";
import axios from "axios";
import { Alert, Grid, MenuItem, Stack, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { ValidationError } from "yup";
import Container from "../../components/Container";
import { Card } from "../../components/Card";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import { useCurso } from "../../hooks/use-curso";
import { usePeriodoLetivo } from "../../hooks/use-periodo-letivo";
import { useRegraPontuacao } from "../../hooks/use-regra-pontuacao";
import type { CursoResponse } from "../../models/curso-model";
import type { PeriodoLetivoResponse } from "../../models/periodo-letivo-model";
import type { ErroRegraPontuacao, RegraPontuacao, RascunhoRegraPontuacao, SubgrupoRascunho } from "../../models/regra-pontuacao-model";
import { prepararRegraPontuacao } from "../../validators/regra-pontuacao-schema";
import { formatarPontos, pontosEmCentesimos, pontosParaApi, somarPontosApi } from "../../utils/pontos";

const vazio = (): RascunhoRegraPontuacao => ({ totalPontos: "", subgrupos: [] });

function rascunhoDaRegra(regra: RegraPontuacao | null): RascunhoRegraPontuacao {
  if (!regra) return vazio();
  return {
    totalPontos: regra.totalPontos.replace(".", ","),
    subgrupos: [...regra.subgrupos].sort((a, b) => a.ordem - b.ordem).map((subgrupo) => ({
      chave: subgrupo.id,
      id: subgrupo.id,
      nome: subgrupo.nome,
      orcamentoPontos: subgrupo.orcamentoPontos.replace(".", ","),
      modoQuantidade: subgrupo.modoQuantidade,
      quantidadeFixa: subgrupo.quantidadeFixa == null ? "" : String(subgrupo.quantidadeFixa),
    })),
  };
}

function resumo(rascunho: RascunhoRegraPontuacao): { soma: string; saldo: string } {
  try {
    const somaApi = somarPontosApi(rascunho.subgrupos.map((subgrupo) => pontosParaApi(subgrupo.orcamentoPontos, { positivo: true })));
    if (!rascunho.totalPontos) return { soma: formatarPontos(somaApi), saldo: "-" };
    const saldo = pontosEmCentesimos(pontosParaApi(rascunho.totalPontos, { positivo: true })) - pontosEmCentesimos(somaApi);
    const modulo = saldo < 0n ? -saldo : saldo;
    const saldoApi = `${modulo / 100n}.${(modulo % 100n).toString().padStart(2, "0")}`;
    return { soma: formatarPontos(somaApi), saldo: `${saldo < 0n ? "-" : ""}${formatarPontos(saldoApi)}` };
  } catch { return { soma: "-", saldo: "-" }; }
}

function mensagemDoErro(erro: unknown, fallback: string): string {
  if (axios.isAxiosError<ErroRegraPontuacao>(erro)) {
    return erro.response?.data?.mensagem ?? erro.response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function RegraPontuacaoCurso() {
  const cursoId = useParams().id ?? "";
  const { carregando: carregandoCurso, buscarCursoPorId } = useCurso();
  const { carregando: carregandoPeriodos, listarPeriodosLetivos } = usePeriodoLetivo();
  const { carregando: carregandoRegra, buscarRegra, salvarRegra } = useRegraPontuacao();
  const [curso, setCurso] = useState<CursoResponse | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoLetivoResponse[]>([]);
  const [periodoId, setPeriodoId] = useState("");
  const [regra, setRegra] = useState<RegraPontuacao | null>(null);
  const [form, setForm] = useState<RascunhoRegraPontuacao>(vazio);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null);
  const [carregandoContexto, setCarregandoContexto] = useState(true);
  const [erroContexto, setErroContexto] = useState(false);
  const [tentativaContexto, setTentativaContexto] = useState(0);
  const [lendo, setLendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroLeitura, setErroLeitura] = useState(false);
  const [ausente, setAusente] = useState(false);
  const [conflito, setConflito] = useState(false);
  const consultaAtual = useRef(0);
  const envioEmCurso = useRef(false);
  const proximaChave = useRef(0);
  const campos = useRef<Record<string, { focus(): void } | null>>({});

  const carregarContexto = useEffectEvent(async (cancelado: () => boolean) => {
    consultaAtual.current += 1;
    setCarregandoContexto(true);
    setCurso(null);
    setPeriodos([]);
    setPeriodoId("");
    setRegra(null);
    setForm(vazio());
    setAusente(false);
    setConflito(false);
    setErroLeitura(false);
    setLendo(false);
    setErros({});
    setAlerta(null);
    try {
      if (!cursoId) throw new Error("Curso ausente.");
      const [cursoEncontrado, periodosEncontrados] = await Promise.all([
        buscarCursoPorId(cursoId), listarPeriodosLetivos(),
      ]);
      if (cancelado()) return;
      setCurso(cursoEncontrado);
      setPeriodos(periodosEncontrados);
      setErroContexto(false);
    } catch {
      if (cancelado()) return;
      setErroContexto(true);
      setAlerta({ tipo: "error", mensagem: "Não foi possível carregar o curso e os períodos letivos." });
    } finally {
      if (!cancelado()) setCarregandoContexto(false);
    }
  });

  useEffect(() => {
    let cancelado = false;
    void carregarContexto(() => cancelado);
    return () => { cancelado = true; consultaAtual.current += 1; };
  }, [cursoId, tentativaContexto]);

  async function carregarRegra(id: string, preservarRascunho = false) {
    const consulta = ++consultaAtual.current;
    setLendo(true);
    setAlerta(null);
    setErroLeitura(false);
    if (!preservarRascunho) {
      setRegra(null);
      setForm(vazio());
      setAusente(false);
      setConflito(false);
      setErros({});
    }
    try {
      const encontrada = await buscarRegra(cursoId, id);
      if (consulta !== consultaAtual.current) return;
      const rascunho = rascunhoDaRegra(encontrada);
      setRegra(encontrada);
      setForm(rascunho);
      setAusente(encontrada === null);
      setConflito(false);
      setErros({});
    } catch (erro) {
      if (consulta !== consultaAtual.current) return;
      setErroLeitura(true);
      setAlerta({ tipo: "error", mensagem: mensagemDoErro(erro, "Não foi possível carregar a regra.") });
    } finally {
      if (consulta === consultaAtual.current) setLendo(false);
    }
  }

  const ocupada = carregandoContexto || carregandoCurso || carregandoPeriodos || carregandoRegra || lendo || enviando;
  const preservada = regra?.estado === "PRESERVADA" || regra?.usadaEm != null;
  const bloqueada = !periodoId || ocupada || erroContexto || erroLeitura || preservada;
  const distribuicao = resumo(form);

  function mudarGrupo(indice: number, alteracoes: Partial<SubgrupoRascunho>) {
    setForm((anterior) => ({ ...anterior, subgrupos: anterior.subgrupos.map((subgrupo, posicao) => posicao === indice ? { ...subgrupo, ...alteracoes } : subgrupo) }));
  }

  function mostrarErros(errosEncontrados: Record<string, string>, mensagem: string) {
    setErros(errosEncontrados);
    setAlerta({ tipo: "error", mensagem });
    const primeiroCampo = Object.keys(errosEncontrados)[0];
    campos.current[primeiroCampo]?.focus();
  }

  async function salvar() {
    if (bloqueada || conflito || envioEmCurso.current) return;
    let payload;
    try {
      payload = prepararRegraPontuacao(form, regra?.versao ?? null);
    } catch (erro) {
      if (!(erro instanceof ValidationError)) return;
      const errosEncontrados: Record<string, string> = {};
      for (const item of erro.inner) if (item.path) errosEncontrados[item.path] = item.message;
      mostrarErros(errosEncontrados, errosEncontrados.subgrupos ?? "Confira os campos da regra antes de salvar.");
      return;
    }
    envioEmCurso.current = true;
    setEnviando(true);
    setErros({});
    setAlerta(null);
    const consulta = consultaAtual.current;
    try {
      const salva = await salvarRegra(cursoId, periodoId, payload);
      if (consulta !== consultaAtual.current) return;
      setRegra(salva);
      setForm(rascunhoDaRegra(salva));
      setAusente(false);
      setAlerta({ tipo: "success", mensagem: "Regra salva com sucesso!" });
    } catch (erro) {
      if (consulta !== consultaAtual.current) return;
      const detalhes = axios.isAxiosError<ErroRegraPontuacao>(erro) ? erro.response : undefined;
      setConflito(detalhes?.status === 409);
      const errosEncontrados: Record<string, string> = {};
      for (const campo of detalhes?.data?.campos ?? []) errosEncontrados[campo.campo] = campo.mensagem;
      mostrarErros(errosEncontrados, mensagemDoErro(erro, "Não foi possível salvar a regra."));
    } finally {
      envioEmCurso.current = false;
      setEnviando(false);
    }
  }

  const estiloAcao = { width: { xs: "100%", sm: "auto" }, minWidth: 170, whiteSpace: "nowrap" };

  return (
    <Container>
      <Stack gap={2}>
        <Typography variant="h5">Pontuação {curso ? `- ${curso.nome}` : ""}</Typography>
        {alerta && <Alert severity={alerta.tipo}>{alerta.mensagem}</Alert>}
        {ocupada && <Typography role="status">{enviando ? "Salvando regra..." : "Carregando..."}</Typography>}
        {erroContexto && <Button variant="outlined" sx={estiloAcao} onClick={() => setTentativaContexto((valor) => valor + 1)}>Tentar novamente</Button>}
        <Card.Root>
          <Card.Header><Card.Title>Resumo do Curso</Card.Title></Card.Header>
          <Card.Content>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}><Typography variant="body2"><strong>Código:</strong> {curso?.codigo ?? "-"}</Typography></Grid>
              <Grid size={{ xs: 12, md: 3 }}><Typography variant="body2"><strong>Nome:</strong> {curso?.nome ?? "-"}</Typography></Grid>
              <Grid size={{ xs: 12, md: 3 }}><Typography variant="body2"><strong>Departamento:</strong> {curso?.departamento.nome ?? "-"}</Typography></Grid>
              <Grid size={{ xs: 12, md: 3 }}><Typography variant="body2"><strong>Faculdade:</strong> {curso?.departamento.faculdade.nome ?? "-"}</Typography></Grid>
            </Grid>
          </Card.Content>
        </Card.Root>
        <Card.Root>
          <Card.Header><Card.Title>Regra do período letivo</Card.Title></Card.Header>
          <Card.Content>
            <Stack component="form" noValidate gap={2} onSubmit={(evento) => { evento.preventDefault(); void salvar(); }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField id="periodo-letivo" label="Período letivo" select value={periodoId}
                    disabled={carregandoContexto || erroContexto || enviando}
                    onChange={(evento) => { const id = evento.target.value; setPeriodoId(id); if (id) void carregarRegra(id); }}>
                    {periodos.map((periodo) => <MenuItem key={periodo.id} value={periodo.id}>{periodo.codigo}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField id="total-pontos" label="Total de pontos" required type="text" value={form.totalPontos}
                    disabled={bloqueada} error={!!erros.totalPontos} helperText={erros.totalPontos}
                    inputRef={(elemento: HTMLInputElement | null) => { campos.current.totalPontos = elemento; }}
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                    onChange={(evento) => setForm((anterior) => ({ ...anterior, totalPontos: evento.target.value }))} />
                </Grid>
              </Grid>
              {!periodoId && <Typography color="text.secondary">Selecione o período letivo institucional para consultar a regra.</Typography>}
              {ausente && !erroLeitura && <Typography color="text.secondary">Regra não configurada para este curso e período. Defina o total e a distribuição.</Typography>}
              {preservada && <Typography role="status" aria-label="Regra preservada">Regra preservada após o primeiro uso. A estrutura não pode ser alterada, mesmo se a avaliação inicial for removida.</Typography>}
              {regra && <Typography variant="body2" color="text.secondary">Versão {regra.versao} - Origem: {regra.origem === "HISTORICA" ? "histórica" : "configurada"}</Typography>}
              {(conflito || erroLeitura) && <Stack gap={1}>
                {conflito && <Typography variant="body2">O rascunho foi mantido. Recarregar substitui este rascunho pela versão salva.</Typography>}
                <Button variant="outlined" sx={estiloAcao} disabled={ocupada} onClick={() => void carregarRegra(periodoId, true)}>Recarregar regra</Button>
              </Stack>}
              {form.subgrupos.map((subgrupo, indice) => {
                const caminho = `subgrupos[${indice}]`;
                return <Stack key={subgrupo.chave} component="fieldset" aria-label={`Subgrupo ${indice + 1}`} gap={2}
                  sx={{ m: 0, p: 2, minWidth: 0, border: "1px solid", borderColor: "grey.200", borderRadius: 1 }}>
                  <Typography component="legend" variant="body2" fontWeight="bold">Subgrupo {indice + 1}</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField id={`${subgrupo.chave}-nome`} label="Nome do subgrupo" required value={subgrupo.nome} disabled={bloqueada}
                        error={!!erros[`${caminho}.nome`]} helperText={erros[`${caminho}.nome`]}
                        inputRef={(elemento: HTMLInputElement | null) => { campos.current[`${caminho}.nome`] = elemento; }}
                        onChange={(evento) => mudarGrupo(indice, { nome: evento.target.value })} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField id={`${subgrupo.chave}-orcamento`} label="Orçamento em pontos" required type="text" value={subgrupo.orcamentoPontos} disabled={bloqueada}
                        error={!!erros[`${caminho}.orcamentoPontos`]} helperText={erros[`${caminho}.orcamentoPontos`]}
                        inputRef={(elemento: HTMLInputElement | null) => { campos.current[`${caminho}.orcamentoPontos`] = elemento; }}
                        slotProps={{ htmlInput: { inputMode: "decimal" } }}
                        onChange={(evento) => mudarGrupo(indice, { orcamentoPontos: evento.target.value })} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField id={`${subgrupo.chave}-modo`} label="Modo de quantidade" select value={subgrupo.modoQuantidade} disabled={bloqueada}
                        onChange={(evento) => mudarGrupo(indice, { modoQuantidade: evento.target.value as SubgrupoRascunho["modoQuantidade"], quantidadeFixa: "" })}>
                        <MenuItem value="FIXA">Fixa</MenuItem><MenuItem value="SEM_LIMITE">Sem limite</MenuItem>
                      </TextField>
                    </Grid>
                    {subgrupo.modoQuantidade === "FIXA" && <Grid size={{ xs: 12, md: 6 }}>
                      <TextField id={`${subgrupo.chave}-quantidade`} label="Quantidade fixa" required type="text" value={subgrupo.quantidadeFixa} disabled={bloqueada}
                        error={!!erros[`${caminho}.quantidadeFixa`]} helperText={erros[`${caminho}.quantidadeFixa`]}
                        inputRef={(elemento: HTMLInputElement | null) => { campos.current[`${caminho}.quantidadeFixa`] = elemento; }}
                        slotProps={{ htmlInput: { inputMode: "numeric" } }}
                        onChange={(evento) => mudarGrupo(indice, { quantidadeFixa: evento.target.value })} />
                    </Grid>}
                  </Grid>
                  <Stack direction="row" justifyContent="flex-end">
                    <Button variant="outlined" color="error" disabled={bloqueada} sx={estiloAcao}
                      onClick={() => { setForm((anterior) => ({ ...anterior, subgrupos: anterior.subgrupos.filter((_, posicao) => posicao !== indice) })); setErros({}); }}>
                      Remover subgrupo
                    </Button>
                  </Stack>
                </Stack>;
              })}
              <Button variant="outlined" sx={estiloAcao} disabled={bloqueada} onClick={() => {
                const chave = `novo-${proximaChave.current++}`;
                setForm((anterior) => ({ ...anterior, subgrupos: [...anterior.subgrupos, { chave, nome: "", orcamentoPontos: "", modoQuantidade: "SEM_LIMITE", quantidadeFixa: "" }] }));
              }}>Adicionar subgrupo</Button>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}><Typography>Soma dos orçamentos</Typography><Typography component="output" aria-label="Soma dos orçamentos">{distribuicao.soma}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography>Saldo a distribuir</Typography><Typography component="output" aria-label="Saldo a distribuir">{distribuicao.saldo}</Typography></Grid>
              </Grid>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end">
                <Button type="submit" variant="contained" disabled={bloqueada || conflito} isLoading={enviando}
                  aria-label={regra ? "Salvar regra" : "Disponibilizar regra"}
                  sx={{ ...estiloAcao, color: "#073440", "&:focus-visible": { outline: "2px solid #006782", outlineOffset: 2 } }}>
                  {regra ? "Salvar regra" : "Disponibilizar regra"}
                </Button>
              </Stack>
            </Stack>
          </Card.Content>
        </Card.Root>
      </Stack>
    </Container>
  );
}
