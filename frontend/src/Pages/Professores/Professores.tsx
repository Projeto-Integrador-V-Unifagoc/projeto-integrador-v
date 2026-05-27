import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Grid, IconButton, Stack, Tooltip } from "@mui/material";
import { Pencil, Trash2 } from "lucide-react";
import type { GridColDef } from "@mui/x-data-grid";

import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import { Dialog } from "../../components/Dialog";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import SearchableSelect from "../../components/SearchableSelect/SearchableSelect";
import type { SelectOption } from "../../components/SearchableSelect/SearchableSelect";
import { professorApi } from "../../services/professor-api";
import { cursoApi } from "../../services/curso-api";
import { cidadeApi } from "../../services/cidade-api";
import type { Professor, AtualizarProfessorDTO } from "../../models/professor-model";
import type { CursoResponse } from "../../models/curso-model";
import type { CidadeModel } from "../../models/cidade-model";
import type { Cursos } from "../../enums/cursos";

interface ProfessorEditData {
    nome: string;
    cpf: string;
    dataNascimento: string;
    email: string;
    senha: string;
    curso_id: string;
    faculdade_id: string;
    cidade_id: string;
    uf: string;
    curso_nome: string;
    faculdade_nome: string;
    cidade_nome: string;
    logradouro: string;
    bairro: string;
    numero: string;
    cep: string;
}

const initialEditData: ProfessorEditData = {
    nome: "",
    cpf: "",
    dataNascimento: "",
    email: "",
    senha: "",
    curso_id: "",
    faculdade_id: "",
    cidade_id: "",
    uf: "",
    curso_nome: "",
    faculdade_nome: "",
    cidade_nome: "",
    logradouro: "",
    bairro: "",
    numero: "",
    cep: "",
};

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
    const [faculdadeOptions, setFaculdadeOptions] = useState<SelectOption[]>([]);
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
    const [filters, setFilters] = useState<{ codigo?: string; matricula?: string; curso?: Cursos | ""; periodo?: string }>({});
    const [editData, setEditData] = useState<ProfessorEditData>(initialEditData);

    const faculdades = useMemo(() => mapearFaculdades(cursos), [cursos]);

    useEffect(() => {
        void carregarDados();
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
            setFaculdadeOptions(mapearFaculdades(cursosResponse));
            setCidadeOptions(mapearCidades(cidadesResponse));
        } catch (error) {
            setErrorMessage(getMensagemErro(error, "Nao foi possivel carregar professores."));
        } finally {
            setLoading(false);
        }
    }

    function mapearCursos(data: CursoResponse[]) {
        return data.map((curso) => ({ id: curso.id, label: curso.nome, sublabel: curso.codigo }));
    }

    function mapearFaculdades(data: CursoResponse[]) {
        const mapa = new Map<string, SelectOption>();
        data.forEach((curso) => {
            const faculdade = curso.departamento?.faculdade;
            if (faculdade?.id) mapa.set(faculdade.id, { id: faculdade.id, label: faculdade.nome });
        });
        return Array.from(mapa.values()).sort((a, b) => a.label.localeCompare(b.label));
    }

    function mapearCidades(data: CidadeModel[]) {
        return data.map((cidade) => ({ id: String(cidade.ibge), label: cidade.nome, sublabel: cidade.uf }));
    }

    const professoresFiltrados = useMemo(() => {
        const search = normalizar(searchValue);
        return professores.filter((professor) => {
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
    }, [filters, professores, searchValue]);

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

    function handleSearchFaculdade(query: string) {
        const term = normalizar(query);
        setFaculdadeOptions(faculdades.filter((faculdade) => normalizar(faculdade.label).includes(term)));
    }

    async function handleSearchCidade(query: string) {
        setLoadingCidades(true);
        try {
            const response = await cidadeApi.buscarCidades(query ? { nome: query } : undefined);
            setCidades(response);
            setCidadeOptions(mapearCidades(response));
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
            faculdade_id: faculdade?.id || prev.faculdade_id,
            faculdade_nome: faculdade?.nome || prev.faculdade_nome,
        }));
        clearError("curso_id");
        clearError("faculdade_id");
    }

    function handleSelectFaculdade(option: SelectOption) {
        setEditData((prev) => ({ ...prev, faculdade_id: option.id, faculdade_nome: option.label }));
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

    async function abrirEdicaoCompleta(professor: Professor) {
        try {
            const professorCompleto = await professorApi.buscarPorId(professor.id);
            setProfessorSelecionado(professorCompleto);
            setEditData({
                nome: professorCompleto.nome,
                cpf: professorCompleto.cpf,
                dataNascimento: professorCompleto.data_nascimento?.slice(0, 10) || "",
                email: professorCompleto.email,
                senha: "",
                curso_id: professorCompleto.curso_id || "",
                faculdade_id: professorCompleto.faculdade_id || "",
                cidade_id: professorCompleto.cidade_id || "",
                uf: professorCompleto.estado || "",
                curso_nome: professorCompleto.curso || "",
                faculdade_nome: professorCompleto.faculdade || "",
                cidade_nome: "",
                logradouro: professorCompleto.logradouro || "",
                bairro: professorCompleto.bairro || "",
                numero: professorCompleto.numero || "",
                cep: professorCompleto.cep || "",
            });
            setErrors({});
            setDialogEditOpen(true);
        } catch (error) {
            setErrorMessage(getMensagemErro(error, "Erro ao carregar dados do professor."));
        }
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

        if (editData.email && !/\S+@\S+\.\S+/.test(editData.email)) novosErros.email = "E-mail invalido";
        if (editData.cpf && editData.cpf.replace(/\D/g, "").length !== 11) {
            novosErros.cpf = "CPF deve ter 11 digitos";
        }
        if (!editData.nome.trim()) novosErros.nome = "Campo obrigatorio";
        if (!editData.email.trim()) novosErros.email = "Campo obrigatorio";
        if (!editData.cpf.trim()) novosErros.cpf = "Campo obrigatorio";
        if (!editData.curso_id) novosErros.curso_id = "Campo obrigatorio";
        if (!editData.faculdade_id) novosErros.faculdade_id = "Campo obrigatorio";

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
                email: editData.email.trim(),
                senha: editData.senha || undefined,
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
            setSuccessMessage("Professor excluido com sucesso!");
            setDialogDeleteOpen(false);
        } catch (error) {
            setErrorMessage(getMensagemErro(error, "Erro ao excluir professor."));
        } finally {
            setLoadingDeletar(false);
        }
    }

    const columns: GridColDef[] = [
        { field: "id", headerName: "Id", width: 90 },
        { field: "nome", headerName: "Nome", flex: 1, minWidth: 180 },
        { field: "curso", headerName: "Curso", flex: 1, minWidth: 180 },
        { field: "email", headerName: "Email", flex: 1, minWidth: 200 },
        { field: "cpf", headerName: "CPF", width: 150 },
        { field: "faculdade", headerName: "Faculdade", flex: 1, minWidth: 180 },
        {
            field: "acoes",
            headerName: "Acoes",
            width: 100,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Editar">
                        <IconButton size="small" color="primary" onClick={() => abrirEdicaoCompleta(params.row as Professor)}>
                            <Pencil size={16} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                        <IconButton size="small" color="error" onClick={() => abrirExclusao(params.row as Professor)}>
                            <Trash2 size={16} />
                        </IconButton>
                    </Tooltip>
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
                <DataTable columns={columns} rows={professoresFiltrados} loading={loading} />
            </Container>

            <Dialog.Root open={dialogEditOpen} onClose={() => setDialogEditOpen(false)} maxWidth="md">
                <Dialog.Header>
                    <Dialog.Title>Editar Professor</Dialog.Title>
                    <Dialog.ActionClose onClose={() => setDialogEditOpen(false)} />
                </Dialog.Header>
                <Dialog.Content>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField label="Nome" value={editData.nome} onChange={(e) => handleEditChange("nome", e.target.value)} error={!!errors.nome} helperText={errors.nome} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField label="CPF" value={editData.cpf} onChange={(e) => handleEditChange("cpf", e.target.value)} error={!!errors.cpf} helperText={errors.cpf} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField label="Nascimento" type="date" value={editData.dataNascimento} onChange={(e) => handleEditChange("dataNascimento", e.target.value)} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField label="Email" value={editData.email} onChange={(e) => handleEditChange("email", e.target.value)} error={!!errors.email} helperText={errors.email} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField label="Senha" type="password" value={editData.senha} onChange={(e) => handleEditChange("senha", e.target.value)} helperText="Deixe vazio para manter a atual" />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <SearchableSelect label="Curso" value={editData.curso_id} displayValue={editData.curso_nome} options={cursoOptions} onSearch={handleSearchCurso} onSelect={handleSelectCurso} error={!!errors.curso_id} helperText={errors.curso_id} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <SearchableSelect label="Faculdade" value={editData.faculdade_id} displayValue={editData.faculdade_nome} options={faculdadeOptions} onSearch={handleSearchFaculdade} onSelect={handleSelectFaculdade} error={!!errors.faculdade_id} helperText={errors.faculdade_id} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <TextField label="Logradouro" value={editData.logradouro} onChange={(e) => handleEditChange("logradouro", e.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField label="Bairro" value={editData.bairro} onChange={(e) => handleEditChange("bairro", e.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 2 }}>
                            <TextField label="Numero" value={editData.numero} onChange={(e) => handleEditChange("numero", e.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 2 }}>
                            <TextField label="CEP" value={editData.cep} onChange={(e) => handleEditChange("cep", e.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <SearchableSelect label="Cidade" value={editData.cidade_id} displayValue={editData.cidade_nome} options={cidadeOptions} onSearch={handleSearchCidade} onSelect={handleSelectCidade} loading={loadingCidades} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField label="UF" value={editData.uf} onChange={(e) => handleEditChange("uf", e.target.value.toUpperCase())} inputProps={{ maxLength: 2 }} />
                        </Grid>
                    </Grid>
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
                    <Dialog.Title>Confirmar Exclusao</Dialog.Title>
                    <Dialog.ActionClose onClose={() => setDialogDeleteOpen(false)} />
                </Dialog.Header>
                <Dialog.Content>
                    <p style={{ margin: 0 }}>
                        Tem certeza que deseja excluir o professor <strong>{professorSelecionado?.nome}</strong>?
                    </p>
                </Dialog.Content>
                <Dialog.Footer>
                    <Button variant="outlined" onClick={() => setDialogDeleteOpen(false)}>
                        Cancelar
                    </Button>
                    <Button variant="contained" color="error" onClick={confirmarExclusao} isLoading={loadingDeletar}>
                        Excluir
                    </Button>
                </Dialog.Footer>
            </Dialog.Root>
        </>
    );
}
