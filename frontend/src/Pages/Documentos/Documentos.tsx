import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Chip, IconButton, MenuItem, Snackbar, Stack, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { CheckCircle, FileText, RefreshCw, XCircle } from "lucide-react";

import Container from "../../components/Container";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import DataTable from "../../components/DataTable/DataTable";
import DocumentosAlunoDialog from "../../components/DocumentosAluno/DocumentosAlunoDialog";
import { documentoApi, type InscritoComDocumentos } from "../../services/documento-api";
import {
    documentacaoRegular,
    formatarCpf,
    situacaoDocumentos,
} from "./documentos.constants";

const FILTRO_SITUACAO = [
    { valor: "", label: "Todas as situações" },
    { valor: "pendente", label: "Aguardando validação" },
    { valor: "reprovado", label: "Com documento reprovado" },
    { valor: "regular", label: "Documentação aprovada" },
];

const FILTRO_MATRICULA = [
    { valor: "", label: "Com e sem matrícula" },
    { valor: "sem", label: "Ainda sem matrícula" },
    { valor: "com", label: "Já matriculado" },
];

const ALTURA_TABELA = { xs: 420, sm: "calc(100vh - 330px)" };

function getMensagemErro(err: unknown, fallback: string): string {
    const axiosErr = err as { response?: { data?: { error?: string } } };
    if (axiosErr?.response?.data?.error) return axiosErr.response.data.error;
    if (err instanceof Error) return err.message;
    return fallback;
}

export default function Documentos() {
    const [inscritos, setInscritos] = useState<InscritoComDocumentos[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");
    const [busca, setBusca] = useState("");
    const [filtroSituacao, setFiltroSituacao] = useState("");
    const [filtroCurso, setFiltroCurso] = useState("");
    const [filtroMatricula, setFiltroMatricula] = useState("");
    const [selecionado, setSelecionado] = useState<InscritoComDocumentos | null>(null);
    const [recusando, setRecusando] = useState<InscritoComDocumentos | null>(null);
    const [motivo, setMotivo] = useState("");
    const [processando, setProcessando] = useState("");
    const [aviso, setAviso] = useState("");

    const carregar = useCallback(async () => {
        setCarregando(true);
        setErro("");
        try {
            setInscritos(await documentoApi.listarInscritos());
        } catch (err) {
            setInscritos([]);
            setErro(getMensagemErro(err, "Não foi possível carregar os inscritos."));
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        void carregar();
    }, [carregar]);

    const validarTodos = useCallback(
        async (inscrito: InscritoComDocumentos, status: "APROVADO" | "REPROVADO", observacao?: string) => {
            setProcessando(inscrito.aluno_id);
            setErro("");
            try {
                await documentoApi.validarTodosDoAluno(inscrito.aluno_id, status, observacao);
                setAviso(
                    status === "APROVADO"
                        ? `Documentação de ${inscrito.aluno_nome} aprovada.`
                        : `Documentação de ${inscrito.aluno_nome} recusada. O aluno recebe o link para reenviar.`,
                );
                await carregar();
            } catch (err) {
                setErro(getMensagemErro(err, "Não foi possível validar os documentos."));
            } finally {
                setProcessando("");
            }
        },
        [carregar],
    );

    const cursos = useMemo(
        () => Array.from(new Set(inscritos.map((i) => i.curso_nome).filter((c): c is string => !!c))).sort(),
        [inscritos],
    );

    const linhas = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        const somenteDigitos = termo.replace(/\D/g, "");

        return inscritos.filter((i) => {
            if (termo) {
                const nome = String(i.aluno_nome ?? "").toLowerCase();
                const cpf = String(i.aluno_cpf ?? "").replace(/\D/g, "");
                const ra = String(i.aluno_matricula ?? "");
                const casaNome = nome.includes(termo);
                const casaCpf = somenteDigitos.length > 0 && cpf.includes(somenteDigitos);
                const casaRa = somenteDigitos.length > 0 && ra.includes(somenteDigitos);
                if (!casaNome && !casaCpf && !casaRa) return false;
            }

            if (filtroSituacao === "pendente" && i.documentos_pendentes === 0) return false;
            if (filtroSituacao === "reprovado" && i.documentos_reprovados === 0) return false;
            if (filtroSituacao === "regular" && !documentacaoRegular(i)) return false;

            if (filtroCurso && i.curso_nome !== filtroCurso) return false;

            if (filtroMatricula === "sem" && i.tem_matricula) return false;
            if (filtroMatricula === "com" && !i.tem_matricula) return false;

            return true;
        });
    }, [inscritos, busca, filtroSituacao, filtroCurso, filtroMatricula]);

    const aguardando = useMemo(
        () => inscritos.filter((i) => i.documentos_pendentes > 0).length,
        [inscritos],
    );

    const columns: GridColDef<InscritoComDocumentos>[] = [
        { field: "aluno_nome", headerName: "Aluno", flex: 1.4, minWidth: 180 },
        {
            field: "aluno_cpf",
            headerName: "CPF",
            width: 140,
            valueFormatter: (value) => formatarCpf(value as string),
        },
        { field: "aluno_matricula", headerName: "RA", width: 70 },
        { field: "curso_nome", headerName: "Curso", flex: 1, minWidth: 150 },
        {
            field: "documentos_total",
            headerName: "Aprovados",
            width: 105,
            align: "center",
            headerAlign: "center",
            sortable: false,
            renderCell: (params) => `${params.row.documentos_aprovados}/${params.row.documentos_total}`,
        },
        {
            field: "situacao",
            headerName: "Situação",
            width: 175,
            sortable: false,
            renderCell: (params) => {
                const cfg = situacaoDocumentos(params.row);
                return <Chip label={cfg.label} color={cfg.color} size="small" />;
            },
        },
        {
            field: "tem_matricula",
            headerName: "Matrícula",
            width: 120,
            sortable: false,
            renderCell: (params) => (
                <Chip
                    label={params.row.tem_matricula ? "Matriculado" : "Sem"}
                    color={params.row.tem_matricula ? "success" : "default"}
                    size="small"
                    variant="outlined"
                />
            ),
        },
        {
            field: "acoes",
            headerName: "Ações",
            width: 160,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                const ocupado = processando === params.row.aluno_id;
                const semEnvios = params.row.documentos_total === 0;

                return (
                    <Stack direction="row" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Aprovar todos os documentos">
                            <span>
                                <IconButton
                                    color="success"
                                    disabled={ocupado || semEnvios || documentacaoRegular(params.row)}
                                    onClick={() => void validarTodos(params.row, "APROVADO")}
                                >
                                    <CheckCircle size={18} />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Recusar todos os documentos">
                            <span>
                                <IconButton
                                    color="error"
                                    disabled={ocupado || semEnvios}
                                    onClick={() => { setMotivo(""); setRecusando(params.row); }}
                                >
                                    <XCircle size={18} />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Conferir documento por documento">
                            <IconButton color="primary" onClick={() => setSelecionado(params.row)}>
                                <FileText size={18} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                );
            },
        },
    ];

    return (
        <Container>
            <Stack gap={2}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    gap={1}
                    pt={1}
                >
                    <Stack>
                        <Typography fontWeight="bold" variant="subtitle2">
                            Validação de Documentos
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Confira os documentos enviados na inscrição. Depois de aprovados, a matrícula pode ser
                            aprovada na tela de Matrículas.
                        </Typography>
                    </Stack>

                    <Button
                        variant="outlined"
                        sx={{ width: "auto", minWidth: 120 }}
                        onClick={() => void carregar()}
                        isLoading={carregando}
                    >
                        <RefreshCw size={14} style={{ marginRight: 6 }} />
                        Atualizar
                    </Button>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} gap={2} flexWrap="wrap">
                    <TextField
                        label="Buscar"
                        placeholder="Nome, CPF ou RA"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 260, flex: 1 }}
                    />

                    <TextField
                        select
                        label="Situação"
                        value={filtroSituacao}
                        onChange={(e) => setFiltroSituacao(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 220 }}
                    >
                        {FILTRO_SITUACAO.map((o) => (
                            <MenuItem key={o.valor} value={o.valor}>{o.label}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Curso"
                        value={filtroCurso}
                        onChange={(e) => setFiltroCurso(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 220 }}
                    >
                        <MenuItem value="">Todos os cursos</MenuItem>
                        {cursos.map((curso) => (
                            <MenuItem key={curso} value={curso}>{curso}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Matrícula"
                        value={filtroMatricula}
                        onChange={(e) => setFiltroMatricula(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 220 }}
                    >
                        {FILTRO_MATRICULA.map((o) => (
                            <MenuItem key={o.valor} value={o.valor}>{o.label}</MenuItem>
                        ))}
                    </TextField>
                </Stack>

                {erro && <Alert severity="error" onClose={() => setErro("")}>{erro}</Alert>}

                <Typography variant="body2" color="text.secondary">
                    {linhas.length} de {inscritos.length} inscrito(s)
                    {aguardando > 0 ? ` · ${aguardando} aguardando validação` : ""}
                </Typography>

                <DataTable
                    columns={columns}
                    rows={linhas}
                    getRowId={(row) => row.aluno_id}
                    loading={carregando}
                    onRowClick={(params) => setSelecionado(params.row as InscritoComDocumentos)}
                    emptyTitle="Nenhum inscrito encontrado"
                    emptyDescription="Ajuste os filtros ou aguarde novos envios pela tela de inscrição."
                    sx={{ height: ALTURA_TABELA, cursor: "pointer" }}
                />
            </Stack>

            <Snackbar
                open={!!aviso}
                autoHideDuration={6000}
                onClose={() => setAviso("")}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity="success" variant="filled" onClose={() => setAviso("")} sx={{ width: "100%" }}>
                    {aviso}
                </Alert>
            </Snackbar>

            <Dialog.Root open={!!recusando} onClose={() => setRecusando(null)} maxWidth="xs">
                <Dialog.Header>
                    <Dialog.Title>Recusar todos os documentos</Dialog.Title>
                    <Dialog.ActionClose onClose={() => setRecusando(null)} />
                </Dialog.Header>

                <Dialog.Content>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        {recusando?.aluno_nome} recebe um e-mail com este motivo e um link para reenviar apenas os
                        documentos recusados.
                    </Alert>

                    <TextField
                        label="Motivo da recusa (opcional)"
                        placeholder="Ex.: arquivo ilegível, documento vencido"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        multiline
                        rows={3}
                        InputLabelProps={{ shrink: true }}
                    />
                </Dialog.Content>

                <Dialog.Footer>
                    <Button variant="outlined" onClick={() => setRecusando(null)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="error"
                        isLoading={processando === recusando?.aluno_id}
                        onClick={async () => {
                            if (!recusando) return;
                            await validarTodos(recusando, "REPROVADO", motivo || undefined);
                            setRecusando(null);
                        }}
                    >
                        Confirmar recusa
                    </Button>
                </Dialog.Footer>
            </Dialog.Root>

            <DocumentosAlunoDialog
                aberto={!!selecionado}
                alunoId={selecionado?.aluno_id ?? null}
                alunoNome={selecionado?.aluno_nome}
                alunoCpf={selecionado?.aluno_cpf}
                alunoMatricula={selecionado?.aluno_matricula}
                cursoNome={selecionado?.curso_nome}
                onFechar={() => setSelecionado(null)}
                onAlterado={() => void carregar()}
            />
        </Container>
    );
}
