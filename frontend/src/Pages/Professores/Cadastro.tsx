import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Grid, Stack } from "@mui/material";

import { Card } from "../../components/Card";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import SearchableSelect from "../../components/SearchableSelect/SearchableSelect";
import type { SelectOption } from "../../components/SearchableSelect/SearchableSelect";
import { professorApi } from "../../services/professor-api";
import { cursoApi } from "../../services/curso-api";
import { cidadeApi } from "../../services/cidade-api";
import type { CidadeModel } from "../../models/cidade-model";
import type { CursoResponse } from "../../models/curso-model";
import type { CriarProfessorDTO } from "../../models/professor-model";

interface ProfessorFormData {
    nome: string;
    cpf: string;
    dataNascimento: string;
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

const initialState: ProfessorFormData = {
    nome: "",
    cpf: "",
    dataNascimento: "",
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

export default function Cadastro() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<ProfessorFormData>(initialState);
    const [errors, setErrors] = useState<Partial<Record<keyof ProfessorFormData, string>>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [cursos, setCursos] = useState<CursoResponse[]>([]);
    const [cidades, setCidades] = useState<CidadeModel[]>([]);
    const [cursoOptions, setCursoOptions] = useState<SelectOption[]>([]);
    const [cidadeOptions, setCidadeOptions] = useState<SelectOption[]>([]);
    const [loadingCursos, setLoadingCursos] = useState(false);
    const [loadingCidades, setLoadingCidades] = useState(false);

    useEffect(() => {
        void carregarOpcoesIniciais();
    }, []);

    async function carregarOpcoesIniciais() {
        setLoadingCursos(true);
        setLoadingCidades(true);
        try {
            const [cursosResponse, cidadesResponse] = await Promise.all([
                cursoApi.listarCursos(),
                cidadeApi.buscarCidades(),
            ]);
            setCursos(cursosResponse);
            setCidades(cidadesResponse);
            setCursoOptions(mapearCursos(cursosResponse));
            setCidadeOptions(mapearCidades(cidadesResponse));
        } catch (error) {
            setErrorMessage(getMensagemErro(error, "Nao foi possivel carregar opcoes do cadastro."));
        } finally {
            setLoadingCursos(false);
            setLoadingCidades(false);
        }
    }

    function mapearCursos(data: CursoResponse[]) {
        return data.map((curso) => ({
            id: curso.id,
            label: curso.nome,
            sublabel: curso.codigo,
        }));
    }

    function mapearCidades(data: CidadeModel[]) {
        return data.map((cidade) => ({
            id: String(cidade.ibge),
            label: cidade.nome,
            sublabel: cidade.uf,
        }));
    }

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
        setFormData((prev) => ({
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
        setFormData((prev) => ({
            ...prev,
            cidade_id: option.id,
            cidade_nome: option.label,
            uf: cidade?.uf || option.sublabel || "",
        }));
        clearError("cidade_id");
        clearError("uf");
    }

    function handleInputChange(field: keyof ProfessorFormData, value: string) {
        setFormData((prev) => ({ ...prev, [field]: value }));
        clearError(field);
    }

    function clearError(field: keyof ProfessorFormData) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function validarCampos() {
        const novosErros: Partial<Record<keyof ProfessorFormData, string>> = {};
        const obrigatorios: (keyof ProfessorFormData)[] = [
            "nome",
            "cpf",
            "dataNascimento",
            "curso_id",
            "faculdade_id",
            "cidade_id",
            "uf",
            "logradouro",
            "bairro",
            "numero",
            "cep",
        ];

        obrigatorios.forEach((campo) => {
            if (!formData[campo]?.toString().trim()) novosErros[campo] = "Campo obrigatorio";
        });

        if (formData.cpf && formData.cpf.replace(/\D/g, "").length !== 11) {
            novosErros.cpf = "CPF deve ter 11 digitos";
        }

        setErrors(novosErros);
        return Object.keys(novosErros).length === 0;
    }

    async function gravarAlteracoes() {
        if (!validarCampos()) return;

        setIsLoading(true);
        setErrorMessage(null);
        try {
            const payload: CriarProfessorDTO = {
                nome: formData.nome.trim(),
                cpf: formData.cpf.replace(/\D/g, ""),
                data_nascimento: formData.dataNascimento,
                logradouro: formData.logradouro.trim(),
                numero: formData.numero.trim(),
                bairro: formData.bairro.trim(),
                cidade_id: formData.cidade_id,
                estado: formData.uf,
                cep: formData.cep.trim(),
                curso_id: formData.curso_id,
                faculdade_id: formData.faculdade_id,
                curso_nome: formData.curso_nome,
                faculdade_nome: formData.faculdade_nome,
                cidade_nome: formData.cidade_nome,
                uf_nome: formData.uf,
            };

            await professorApi.criar(payload);
            setSuccessMessage("Professor cadastrado com sucesso!");
            setTimeout(() => navigate("/professores/lista"), 900);
        } catch (error) {
            const mensagem = getMensagemErro(error, "Erro ao cadastrar professor.");
            if (mensagem.toLowerCase().includes("cpf")) {
                setErrors({ cpf: mensagem });
            } else {
                setErrorMessage(mensagem);
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card.Root>
            <Card.Header>Cadastro de Professor</Card.Header>
            <Card.Content>
                {(successMessage || errorMessage) && (
                    <Alert severity={errorMessage ? "error" : "success"} sx={{ mb: 2 }}>
                        {errorMessage || successMessage}
                    </Alert>
                )}

                <Stack gap={2}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                label="Nome"
                                value={formData.nome}
                                onChange={(e) => handleInputChange("nome", e.target.value)}
                                error={!!errors.nome}
                                helperText={errors.nome}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                                label="CPF"
                                value={formData.cpf}
                                onChange={(e) => handleInputChange("cpf", e.target.value)}
                                error={!!errors.cpf}
                                helperText={errors.cpf}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                                label="Nascimento"
                                type="date"
                                value={formData.dataNascimento}
                                onChange={(e) => handleInputChange("dataNascimento", e.target.value)}
                                error={!!errors.dataNascimento}
                                helperText={errors.dataNascimento}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <SearchableSelect
                                label="Curso"
                                placeholder="Buscar curso"
                                value={formData.curso_id}
                                displayValue={formData.curso_nome}
                                options={cursoOptions}
                                onSearch={handleSearchCurso}
                                onSelect={handleSelectCurso}
                                loading={loadingCursos}
                                error={!!errors.curso_id}
                                helperText={errors.curso_id}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                label="Faculdade"
                                value={formData.faculdade_nome}
                                disabled
                                helperText={formData.faculdade_nome || "Definida automaticamente pelo curso"}
                                error={!!errors.faculdade_id}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <TextField
                                label="Logradouro"
                                value={formData.logradouro}
                                onChange={(e) => handleInputChange("logradouro", e.target.value)}
                                error={!!errors.logradouro}
                                helperText={errors.logradouro}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                                label="Bairro"
                                value={formData.bairro}
                                onChange={(e) => handleInputChange("bairro", e.target.value)}
                                error={!!errors.bairro}
                                helperText={errors.bairro}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 2 }}>
                            <TextField
                                label="Numero"
                                value={formData.numero}
                                onChange={(e) => handleInputChange("numero", e.target.value)}
                                error={!!errors.numero}
                                helperText={errors.numero}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 2 }}>
                            <TextField
                                label="CEP"
                                value={formData.cep}
                                onChange={(e) => handleInputChange("cep", e.target.value)}
                                error={!!errors.cep}
                                helperText={errors.cep}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <SearchableSelect
                                label="Cidade"
                                placeholder="Buscar cidade"
                                value={formData.cidade_id}
                                displayValue={formData.cidade_nome}
                                options={cidadeOptions}
                                onSearch={handleSearchCidade}
                                onSelect={handleSelectCidade}
                                loading={loadingCidades}
                                error={!!errors.cidade_id}
                                helperText={errors.cidade_id}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="UF"
                                value={formData.uf}
                                onChange={(e) => handleInputChange("uf", e.target.value.toUpperCase())}
                                error={!!errors.uf}
                                helperText={errors.uf}
                                inputProps={{ maxLength: 2 }}
                            />
                        </Grid>
                    </Grid>

                    <Stack direction="row" justifyContent="flex-end" gap={1}>
                        <Button variant="outlined" onClick={() => navigate("/professores/lista")} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button variant="contained" onClick={gravarAlteracoes} isLoading={isLoading}>
                            Salvar
                        </Button>
                    </Stack>
                </Stack>
            </Card.Content>
        </Card.Root>
    );
}
