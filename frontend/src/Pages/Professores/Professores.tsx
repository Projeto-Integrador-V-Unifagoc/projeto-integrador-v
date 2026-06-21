import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, IconButton, MenuItem, Stack, Tooltip } from "@mui/material";
import { Pencil, RotateCcw, UserRoundX } from "lucide-react";
import type { GridColDef } from "@mui/x-data-grid";

import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import { Dialog } from "../../components/Dialog";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import type { SelectOption } from "../../components/SearchableSelect/SearchableSelect";
import ProfessorFormFields from "./ProfessorFormFields";
import {
    initialProfessorFormData,
    type ProfessorFormData,
} from "./professor-form-model";
import { professorApi } from "../../services/professor-api";
import { cursoApi } from "../../services/curso-api";
import { cidadeApi } from "../../services/cidade-api";
import type { Professor, AtualizarProfessorDTO } from "../../models/professor-model";
import type { CursoResponse } from "../../models/curso-model";
import type { CidadeModel } from "../../models/cidade-model";
import type { Cursos } from "../../enums/cursos";

type ProfessorEditData = ProfessorFormData;

function normalizar(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getMensagemErro(error: unknown, fallback: string) {
    const apiError = error as { response?: { data?: { mensagem?: string; message?: string; error?: string } } };
    return (
        apiError.response?.data?.mensagem ||
        apiError.response?.data?.message ||
        apiError.response?.data?.error ||
        (error instanceof Error ? error.message : "") ||
        fallback
    );
}

export default function Professores() {
    const navigate = useNavigate();
    const [professores, setProfessores] = useState<Professor[]>([]);
    const [cursos, setCursos] = useState<CursoResponse[]>([]);
    const [cidades, setCidades] = useState<CidadeModel[]>([]);
    const [cursoOptions, setCursoOptions] = useState<SelectOption[]>([]);
    const [cidadeOptions, setCidadeOptions] = useState<SelectOption[]>([]);
    const [dialogEditOpen, setDialogEditOpen] = useState(false);
    const [dialogDeleteOpen, setDialogDeleteOpen] = useState(false);
    const [professorSelecionado, setProfessorSelecionado] = useState<Professor | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingDeletar, setLoadingDeletar] = useState(false);
    const [loadingCidades, setLoadingCidades] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof ProfessorEditData, string>>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [searchValue, setSearchValue] = useState("");
    const [filtroAtivo, setFiltroAtivo] = useState<"todos" | "ativos" | "inativos">("todos");
    const [filters, setFilters] = useState<{ codigo?: string; matricula?: string; curso?: Cursos | ""; periodo?: string }>({});
    const [editData, setEditData] = useState<ProfessorEditData>(initialProfessorFormData);

    useEffect(() => {
        void carregarDados();
        // A listagem é carregada uma única vez; as atualizações usam chamadas explícitas.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function carregarDados() {
        setLoading(true);
        try {
            const [professoresResponse, cursosResponse, cidadesResponse] = await Promise.all([
                professorApi.listar(),
                cursoApi.listarCursos(),
                cidadeApi.buscarCidades(),
            ]);
            setProfessores(professoresResponse);
            setCursos(cursosResponse);
            setCidades(cidadesResponse);
            setCursoOptions(mapearCursos(cursosResponse));
            setCidadeOptions(mapearCidades(cidadesResponse));
        } catch (error) {
            setErrorMessage(getMensagemErro(error, "Não foi possível carregar professores."));
        } finally {
            setLoading(false);
        }
    }

    function mapearCursos(data: CursoResponse[]) {
        return data.map((curso) => ({ id: curso.id, label: curso.nome, sublabel: curso.codigo }));
    }

    function mapearCidades(data: CidadeModel[]) {
        return data.map((cidade) => ({ id: String(cidade.ibge), label: cidade.nome, sublabel: cidade.uf }));
    }

    const professoresFiltrados = useMemo(() => {
        const search = normalizar(searchValue);
        return professores.filter((professor) => {
            if (filtroAtivo === "ativos" && !professor.ativo) return false;
            if (filtroAtivo === "inativos" && professor.ativo) return false;
            if (search) {
                const campos = [
                    professor.nome,
                    professor.email,
                    professor.cpf,
                    professor.curso || "",
                    professor.faculdade || "",
                ];
                if (!campos.some((campo) => normalizar(String(campo)).includes(search))) return false;
            }

            if (filters.codigo && !normalizar(professor.cpf).includes(normalizar(filters.codigo))) return false;
            if (filters.matricula && !normalizar(professor.nome).includes(normalizar(filters.matricula))) return false;
            if (filters.curso && professor.curso !== filters.curso) return false;
            if (filters.periodo && professor.faculdade_id !== filters.periodo) return false;
            return true;
        });
    }, [filtroAtivo, filters, professores, searchValue]);

    function handleSearchCurso(query: string) {
        const term = normalizar(query);
        setCursoOptions(
            mapearCursos(
                cursos.filter((curso) =>
                    [curso.nome, curso.codigo].some((campo) => normalizar(String(campo)).includes(term)),
                ),
            ),
        );
    }

    async function handleSearchCidade(query: string) {
        setLoadingCidades(true);
        try {
            const response = await cidadeApi.buscarCidades(query ? { nome: query } : undefined);
            setCidades(response);
            setCidadeOptions(mapearCidades(response));
        } catch (error) {
            setErrorMessage(getMensagemErro(error, "Não foi possível buscar cidades."));
        } finally {
            setLoadingCidades(false);
        }
    }

    function handleSelectCurso(option: SelectOption) {
        const curso = cursos.find((item) => item.id === option.id);
        const faculdade = curso?.departamento?.faculdade;
        setEditData((prev) => ({
            ...prev,
            curso_id: option.id,
            curso_nome: option.label,
            faculdade_id: faculdade?.id || "",
            faculdade_nome: faculdade?.nome || "",
        }));
        clearError("curso_id");
        clearError("faculdade_id");
    }

    function handleSelectCidade(option: SelectOption) {
        const cidade = cidades.find((item) => String(item.ibge) === option.id);
        setEditData((prev) => ({
            ...prev,
            cidade_id: option.id,
            cidade_nome: option.label,
            uf: cidade?.uf || option.sublabel || "",
        }));
        clearError("cidade_id");
        clearError("uf");
    }

    function abrirEdicaoCompleta(professor: Professor) {
        setProfessorSelecionado(professor);
        setEditData({
            nome: professor.nome,
            cpf: professor.cpf,
            dataNascimento: professor.data_nascimento?.slice(0, 10) || "",
            curso_id: professor.curso_id || "",
            faculdade_id: professor.faculdade_id || "",
            cidade_id: professor.cidade_id || "",
            uf: professor.estado || "",
            curso_nome: professor.curso || "",
            faculdade_nome: professor.faculdade || "",
            cidade_nome: cidades.find((cidade) => String(cidade.ibge) === professor.cidade_id)?.nome || "",
            logradouro: professor.logradouro || "",
            bairro: professor.bairro || "",
            numero: professor.numero || "",
            cep: professor.cep || "",
        });
        setErrors({});
        setDialogEditOpen(true);
    }

    function abrirExclusao(professor: Professor) {
        setProfessorSelecionado(professor);
        setDialogDeleteOpen(true);
    }

    function handleEditChange(field: keyof ProfessorEditData, value: string) {
        setEditData((prev) => ({ ...prev, [field]: value }));
        clearError(field);
    }

    function clearError(field: keyof ProfessorEditData) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function validarEdicao() {
        const novosErros: Partial<Record<keyof ProfessorEditData, string>> = {};

        if (editData.cpf && editData.cpf.replace(/\D/g, "").length !== 11) {
            novosErros.cpf = "CPF deve ter 11 dígitos";
        }
        if (!editData.nome.trim()) novosErros.nome = "Campo obrigatório";
        if (!editData.cpf.trim()) novosErros.cpf = "Campo obrigatório";
        if (!editData.curso_id) novosErros.curso_id = "Campo obrigatório";
        if (!editData.faculdade_id) novosErros.faculdade_id = "Campo obrigatório";

        setErrors(novosErros);
        return Object.keys(novosErros).length === 0;
    }

    async function salvarEdicao() {
        if (!professorSelecionado || !validarEdicao()) return;
        setLoadingSalvar(true);
        setErrorMessage(null);
        try {
            const payload: AtualizarProfessorDTO = {
                nome: editData.nome.trim(),
                cpf: editData.cpf.replace(/\D/g, ""),
                data_nascimento: editData.dataNascimento || undefined,
                logradouro: editData.logradouro || undefined,
                numero: editData.numero || undefined,
                bairro: editData.bairro || undefined,
                cidade_id: editData.cidade_id || undefined,
                estado: editData.uf || undefined,
                cep: editData.cep || undefined,
                curso_id: editData.curso_id,
                faculdade_id: editData.faculdade_id,
            };

            await professorApi.atualizar(professorSelecionado.id, payload);
            await carregarDados();
            setSuccessMessage("Professor atualizado com sucesso!");
            setDialogEditOpen(false);
        } catch (error) {
            setErrorMessage(getMensagemErro(error, "Erro ao atualizar professor."));
        } finally {
            setLoadingSalvar(false);
        }
    }

    async function confirmarExclusao() {
        if (!professorSelecionado) return;
        setLoadingDeletar(true);
        setErrorMessage(null);
        try {
            await professorApi.deletar(professorSelecionado.id);
            await carregarDados();
            setSuccessMessage("Professor inativado com sucesso!");
            setDialogDeleteOpen(false);
        } catch (error) {
            setErrorMessage(getMensagemErro(error, "Erro ao inativar professor."));
        } finally {
            setLoadingDeletar(false);
        }
    }

    async function reativarProfessor(professor: Professor) {
        setLoadingDeletar(true);
        setErrorMessage(null);
        try {
            await professorApi.reativar(professor.id);
            await carregarDados();
            setSuccessMessage("Professor reativado com sucesso!");
        } catch (error) {
            setErrorMessage(getMensagemErro(error, "Erro ao reativar professor."));
        } finally {
            setLoadingDeletar(false);
        }
    }

    const columns: GridColDef[] = [
        { field: "nome", headerName: "Nome", flex: 1, minWidth: 180 },
        { field: "curso", headerName: "Curso", flex: 1, minWidth: 180 },
        { field: "cpf", headerName: "CPF", width: 150 },
        { field: "faculdade", headerName: "Faculdade", flex: 1, minWidth: 180 },
        { field: "ativo", headerName: "Status", width: 110, valueGetter: (value) => value ? "Ativo" : "Inativo" },
        {
            field: "acoes",
            headerName: "Ações",
            width: 112,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Editar">
                        <IconButton aria-label={`Editar professor ${(params.row as Professor).nome}`} size="small" color="primary" onClick={() => abrirEdicaoCompleta(params.row as Professor)}>
                            <Pencil size={16} />
                        </IconButton>
                    </Tooltip>
                    {(params.row as Professor).ativo ? (
                        <Tooltip title="Inativar">
                            <IconButton aria-label={`Inativar professor ${(params.row as Professor).nome}`} size="small" color="error" onClick={() => abrirExclusao(params.row as Professor)}>
                                <UserRoundX size={16} />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Reativar">
                            <IconButton aria-label={`Reativar professor ${(params.row as Professor).nome}`} size="small" color="success" disabled={loadingDeletar} onClick={() => void reativarProfessor(params.row as Professor)}>
                                <RotateCcw size={16} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            ),
        },
    ];

    return (
        <>
            <Container>
                <SearchTextField
                    buttonOnClick={() => navigate("/professores/cadastro")}
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    filterValues={filters}
                    onFilterChange={setFilters}
                    searchPlaceholder="Pesquisar professor"
                    firstFilterLabel="CPF"
                    secondFilterLabel="Nome"
                    fourthFilterLabel="Faculdade"
                    usePeriodFilter={false}
                    endContent={
                        <TextField
                            select
                            label="Status"
                            value={filtroAtivo}
                            onChange={(event) => setFiltroAtivo(event.target.value as typeof filtroAtivo)}
                            sx={{ width: { xs: "100%", sm: 180 }, flexShrink: 0 }}
                        >
                            <MenuItem value="todos">Todos</MenuItem>
                            <MenuItem value="ativos">Ativos</MenuItem>
                            <MenuItem value="inativos">Inativos</MenuItem>
                        </TextField>
                    }
                >
                    Professores
                </SearchTextField>
                {(successMessage || errorMessage) && (
                    <Alert
                        severity={errorMessage ? "error" : "success"}
                        onClose={() => {
                            setSuccessMessage(null);
                            setErrorMessage(null);
                        }}
                        sx={{ mb: 2 }}
                    >
                        {errorMessage || successMessage}
                    </Alert>
                )}
                <DataTable
                    columns={columns}
                    rows={professoresFiltrados}
                    loading={loading}
                    emptyDescription={professores.length === 0
                        ? "Cadastre um novo professor para começar."
                        : "Revise os critérios da pesquisa ou dos filtros informados."}
                />
            </Container>

            <Dialog.Root open={dialogEditOpen} onClose={() => setDialogEditOpen(false)} maxWidth="md">
                <Dialog.Header>
                    <Dialog.Title>Editar Professor</Dialog.Title>
                    <Dialog.ActionClose onClose={() => setDialogEditOpen(false)} />
                </Dialog.Header>
                <Dialog.Content>
                    <ProfessorFormFields
                        data={editData}
                        errors={errors}
                        cursoOptions={cursoOptions}
                        cidadeOptions={cidadeOptions}
                        onChange={handleEditChange}
                        onSearchCurso={handleSearchCurso}
                        onSearchCidade={(query) => void handleSearchCidade(query)}
                        onSelectCurso={handleSelectCurso}
                        onSelectCidade={handleSelectCidade}
                        loadingCidades={loadingCidades}
                    />
                </Dialog.Content>
                <Dialog.Footer>
                    <Button variant="outlined" onClick={() => setDialogEditOpen(false)}>
                        Cancelar
                    </Button>
                    <Button variant="contained" onClick={salvarEdicao} isLoading={loadingSalvar}>
                        Salvar
                    </Button>
                </Dialog.Footer>
            </Dialog.Root>

            <Dialog.Root open={dialogDeleteOpen} onClose={() => setDialogDeleteOpen(false)} maxWidth="xs">
                <Dialog.Header>
                    <Dialog.Title>Confirmar inativação</Dialog.Title>
                    <Dialog.ActionClose onClose={() => setDialogDeleteOpen(false)} />
                </Dialog.Header>
                <Dialog.Content>
                    <p style={{ margin: 0 }}>
                        Tem certeza que deseja inativar o professor <strong>{professorSelecionado?.nome}</strong>? O histórico acadêmico será preservado.
                    </p>
                </Dialog.Content>
                <Dialog.Footer>
                    <Button variant="outlined" onClick={() => setDialogDeleteOpen(false)}>
                        Cancelar
                    </Button>
                    <Button variant="contained" color="error" onClick={confirmarExclusao} isLoading={loadingDeletar}>
                        Inativar
                    </Button>
                </Dialog.Footer>
            </Dialog.Root>
        </>
    );
}
