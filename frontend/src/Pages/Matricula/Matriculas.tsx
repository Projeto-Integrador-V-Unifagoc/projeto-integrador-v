import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Chip, IconButton, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { CheckCircle, FileText } from "lucide-react";

import Container from "../../components/Container";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import DataTable from "../../components/DataTable/DataTable";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import DocumentosAlunoDialog from "../../components/DocumentosAluno/DocumentosAlunoDialog";
import { useMatricula } from "../../hooks/use-matricula";
import type { MatriculaDetalhada } from "../../models/matricula-model";
import {
    documentacaoRegular,
    formatarCpf,
    situacaoDocumentos,
    STATUS_MATRICULA,
} from "../Documentos/documentos.constants";

const FILTRO_DOCUMENTACAO = [
    { valor: "", label: "Toda a documentação" },
    { valor: "regular", label: "Sem pendências" },
    { valor: "pendente", label: "Com documento pendente" },
    { valor: "reprovado", label: "Com documento reprovado" },
    { valor: "sem", label: "Sem documentos enviados" },
];

function mensagemErro(err: unknown, fallback: string): string {
    const axiosErr = err as { response?: { data?: { error?: string } } };
    if (axiosErr?.response?.data?.error) return axiosErr.response.data.error;
    if (err instanceof Error) return err.message;
    return fallback;
}

export default function Matriculas() {
    const { listarTodas, aprovarMatricula, carregando } = useMatricula();

    const [matriculas, setMatriculas] = useState<MatriculaDetalhada[]>([]);
    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("");
    const [filtroCurso, setFiltroCurso] = useState("");
    const [filtroDocumentacao, setFiltroDocumentacao] = useState("");
    const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null);
    const [aprovando, setAprovando] = useState<MatriculaDetalhada | null>(null);
    const [confirmando, setConfirmando] = useState(false);
    const [documentosDe, setDocumentosDe] = useState<MatriculaDetalhada | null>(null);

    const carregar = useCallback(async () => {
        try {
            setMatriculas(await listarTodas());
        } catch (err) {
            setAlerta({ tipo: "error", mensagem: mensagemErro(err, "Não foi possível carregar as matrículas.") });
        }
    }, []);

    useEffect(() => {
        void carregar();
    }, [carregar]);

    const cursos = useMemo(
        () => Array.from(new Set(matriculas.map((m) => m.curso_nome).filter(Boolean))).sort(),
        [matriculas],
    );

    const linhas = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        const somenteDigitos = termo.replace(/\D/g, "");

        return matriculas.filter((m) => {
            if (termo) {
                const nome = String(m.aluno_nome ?? "").toLowerCase();
                const cpf = String(m.aluno_cpf ?? "").replace(/\D/g, "");
                const ra = String(m.aluno_matricula ?? "");
                const casaNome = nome.includes(termo);
                const casaCpf = somenteDigitos.length > 0 && cpf.includes(somenteDigitos);
                const casaRa = somenteDigitos.length > 0 && ra.includes(somenteDigitos);
                if (!casaNome && !casaCpf && !casaRa) return false;
            }

            if (filtroStatus && String(m.status).toLowerCase() !== filtroStatus) return false;
            if (filtroCurso && m.curso_nome !== filtroCurso) return false;

            if (filtroDocumentacao === "regular" && !documentacaoRegular(m)) return false;
            if (filtroDocumentacao === "pendente" && m.documentos_pendentes === 0) return false;
            if (filtroDocumentacao === "reprovado" && m.documentos_reprovados === 0) return false;
            if (filtroDocumentacao === "sem" && m.documentos_total > 0) return false;

            return true;
        });
    }, [matriculas, busca, filtroStatus, filtroCurso, filtroDocumentacao]);

    const pendentes = useMemo(
        () => matriculas.filter((m) => String(m.status).toLowerCase() === "pendente").length,
        [matriculas],
    );

    function podeAprovar(m: MatriculaDetalhada): boolean {
        return String(m.status).toLowerCase() === "pendente" && documentacaoRegular(m);
    }

    function motivoBloqueio(m: MatriculaDetalhada): string {
        const status = String(m.status).toLowerCase();
        if (status !== "pendente") return `Só matrículas pendentes podem ser aprovadas (situação: ${status}).`;
        if (m.documentos_reprovados > 0) return "Há documento reprovado. Peça o reenvio antes de aprovar.";
        if (m.documentos_pendentes > 0) return "Há documento aguardando validação na tela de Documentos.";
        return "";
    }

    async function confirmarAprovacao() {
        if (!aprovando) return;
        setConfirmando(true);
        try {
            await aprovarMatricula(aprovando.id);
            setAlerta({ tipo: "success", mensagem: `Matrícula de ${aprovando.aluno_nome} aprovada.` });
            setAprovando(null);
            await carregar();
        } catch (err) {
            setAlerta({ tipo: "error", mensagem: mensagemErro(err, "Não foi possível aprovar a matrícula.") });
        } finally {
            setConfirmando(false);
        }
    }

    const columns: GridColDef<MatriculaDetalhada>[] = [
        { field: "aluno_nome", headerName: "Aluno", flex: 1.4, minWidth: 200 },
        {
            field: "aluno_cpf",
            headerName: "CPF",
            width: 150,
            valueFormatter: (value) => formatarCpf(value as string),
        },
        { field: "aluno_matricula", headerName: "RA", width: 90 },
        { field: "curso_nome", headerName: "Curso", flex: 1, minWidth: 160 },
        { field: "turma_sigla", headerName: "Turma", width: 130 },
        { field: "periodo_letivo_codigo", headerName: "Período letivo", width: 140 },
        { field: "periodo_curricular", headerName: "Período", width: 90 },
        { field: "total_disciplinas", headerName: "Disciplinas", width: 110 },
        {
            field: "status",
            headerName: "Situação",
            width: 130,
            sortable: false,
            renderCell: (params) => {
                const cfg = STATUS_MATRICULA[String(params.row.status).toLowerCase()] ?? {
                    label: params.row.status,
                    color: "default" as const,
                };
                return <Chip label={cfg.label} color={cfg.color} size="small" />;
            },
        },
        {
            field: "documentacao",
            headerName: "Documentação",
            width: 190,
            sortable: false,
            renderCell: (params) => {
                const cfg = situacaoDocumentos(params.row);
                return <Chip label={cfg.label} color={cfg.color} size="small" variant="outlined" />;
            },
        },
        {
            field: "acoes",
            headerName: "Ações",
            width: 110,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                const habilitado = podeAprovar(params.row);
                const motivo = habilitado ? "Aprovar matrícula" : motivoBloqueio(params.row);
                return (
                    <Stack direction="row">
                        <Tooltip title="Ver documentos">
                            <IconButton color="primary" onClick={() => setDocumentosDe(params.row)}>
                                <FileText size={18} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={motivo}>
                            <span>
                                <IconButton
                                    color="success"
                                    disabled={!habilitado}
                                    onClick={() => setAprovando(params.row)}
                                >
                                    <CheckCircle size={18} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                );
            },
        },
    ];

    return (
        <Container>
            <Stack gap={2}>
                <SearchTextField
                    addPath="/inscricao"
                    placeholder="Pesquisar por nome, CPF ou RA"
                    showFilters={false}
                    searchValue={busca}
                    onSearchChange={setBusca}
                >
                    Matrículas
                </SearchTextField>

                <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems="center" flexWrap="wrap">
                    <TextField
                        select
                        label="Situação da matrícula"
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 220 }}
                    >
                        <MenuItem value="">Todas as situações</MenuItem>
                        {Object.entries(STATUS_MATRICULA).map(([valor, cfg]) => (
                            <MenuItem key={valor} value={valor}>{cfg.label}</MenuItem>
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
                        label="Documentação"
                        value={filtroDocumentacao}
                        onChange={(e) => setFiltroDocumentacao(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 240 }}
                    >
                        {FILTRO_DOCUMENTACAO.map((opcao) => (
                            <MenuItem key={opcao.valor} value={opcao.valor}>{opcao.label}</MenuItem>
                        ))}
                    </TextField>

                    <Typography variant="body2" color="text.secondary">
                        {linhas.length} de {matriculas.length} matrícula(s)
                        {pendentes > 0 ? ` · ${pendentes} aguardando aprovação` : ""}
                    </Typography>
                </Stack>

                {alerta && (
                    <Alert severity={alerta.tipo} onClose={() => setAlerta(null)}>
                        {alerta.mensagem}
                    </Alert>
                )}

                <DataTable
                    columns={columns}
                    rows={linhas}
                    loading={carregando}
                    emptyTitle="Nenhuma matrícula encontrada"
                    emptyDescription="Ajuste os filtros ou cadastre uma nova inscrição."
                    sx={{ height: { xs: 420, sm: "calc(100vh - 330px)" } }}
                />
            </Stack>

            <Dialog.Root open={!!aprovando} onClose={() => setAprovando(null)} maxWidth="xs">
                <Dialog.Header>
                    <Dialog.Title>Aprovar matrícula</Dialog.Title>
                    <Dialog.ActionClose onClose={() => setAprovando(null)} />
                </Dialog.Header>
                <Dialog.Content>
                    <Typography>
                        Confirmar a aprovação da matrícula de <strong>{aprovando?.aluno_nome}</strong> em{" "}
                        <strong>{aprovando?.curso_nome}</strong>, turma <strong>{aprovando?.turma_sigla}</strong>?
                        A situação passa de pendente para ativa.
                    </Typography>
                </Dialog.Content>
                <Dialog.Footer>
                    <Button variant="outlined" onClick={() => setAprovando(null)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="success"
                        isLoading={confirmando}
                        onClick={() => void confirmarAprovacao()}
                    >
                        Aprovar
                    </Button>
                </Dialog.Footer>
            </Dialog.Root>

            <DocumentosAlunoDialog
                aberto={!!documentosDe}
                alunoId={documentosDe?.aluno_id ?? null}
                alunoNome={documentosDe?.aluno_nome}
                alunoCpf={documentosDe?.aluno_cpf}
                alunoMatricula={documentosDe?.aluno_matricula}
                cursoNome={documentosDe?.curso_nome}
                onFechar={() => setDocumentosDe(null)}
                onAlterado={() => void carregar()}
            />
        </Container>
    );
}
