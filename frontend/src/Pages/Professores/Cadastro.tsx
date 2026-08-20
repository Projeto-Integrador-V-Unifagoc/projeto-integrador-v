import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Stack } from "@mui/material";
import { ValidationError } from "yup";

import { Card } from "../../components/Card";
import Button from "../../components/Button";
import type { SelectOption } from "../../components/SearchableSelect/SearchableSelect";
import { professorApi } from "../../services/professor-api";
import { cursoApi } from "../../services/curso-api";
import { cidadeApi } from "../../services/cidade-api";
import type { CidadeModel } from "../../models/cidade-model";
import type { CursoResponse } from "../../models/curso-model";
import type { CriarProfessorDTO } from "../../models/professor-model";
import ProfessorFormFields from "./ProfessorFormFields";
import { professorSchema } from "../../validators/professor-schema";
import {
    initialProfessorFormData,
    type ProfessorFormData,
} from "./professor-form-model";

function normalizar(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getMensagemErro(error: unknown, fallback: string) {
    const apiError = error as { response?: { data?: { mensagem?: string; message?: string; error?: string } } };
    return apiError.response?.data?.mensagem || apiError.response?.data?.message || apiError.response?.data?.error ||
        (error instanceof Error ? error.message : "") || fallback;
}

export default function Cadastro() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<ProfessorFormData>(initialProfessorFormData);
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
        // A carga inicial deve ocorrer uma única vez ao abrir o cadastro.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const mapearCursos = (data: CursoResponse[]) => data.map((curso) => ({ id: curso.id, label: curso.nome, sublabel: curso.codigo }));
    const mapearCidades = (data: CidadeModel[]) => data.map((cidade) => ({ id: String(cidade.ibge), label: cidade.nome, sublabel: cidade.uf }));

    async function carregarOpcoesIniciais() {
        setLoadingCursos(true);
        setLoadingCidades(true);
        try {
            const [cursosResponse, cidadesResponse] = await Promise.all([cursoApi.listarCursos(), cidadeApi.buscarCidades()]);
            setCursos(cursosResponse);
            setCidades(cidadesResponse);
            setCursoOptions(mapearCursos(cursosResponse));
            setCidadeOptions(mapearCidades(cidadesResponse));
        } catch (error) {
            setErrorMessage(getMensagemErro(error, "Não foi possível carregar as opções do cadastro."));
        } finally {
            setLoadingCursos(false);
            setLoadingCidades(false);
        }
    }

    function handleSearchCurso(query: string) {
        const term = normalizar(query);
        setCursoOptions(mapearCursos(cursos.filter((curso) =>
            [curso.nome, curso.codigo].some((campo) => normalizar(String(campo)).includes(term)))));
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

    function clearError(field: keyof ProfessorFormData) {
        setErrors((previous) => ({ ...previous, [field]: undefined }));
    }

    function handleSelectCurso(option: SelectOption) {
        const curso = cursos.find((item) => item.id === option.id);
        const faculdade = curso?.departamento?.faculdade;
        setFormData((previous) => ({ ...previous, curso_id: option.id, curso_nome: option.label,
            faculdade_id: faculdade?.id || "", faculdade_nome: faculdade?.nome || "" }));
        clearError("curso_id");
        clearError("faculdade_id");
    }

    function handleSelectCidade(option: SelectOption) {
        const cidade = cidades.find((item) => String(item.ibge) === option.id);
        setFormData((previous) => ({ ...previous, cidade_id: option.id, cidade_nome: option.label,
            uf: cidade?.uf || option.sublabel || "" }));
        clearError("cidade_id");
        clearError("uf");
    }

    function handleInputChange(field: keyof ProfessorFormData, value: string) {
        setFormData((previous) => ({ ...previous, [field]: value }));
        clearError(field);
    }

    async function validarCampos() {
        try {
            await professorSchema.validate(formData, { abortEarly: false });
            setErrors({});
            return true;
        } catch (error) {
            if (!(error instanceof ValidationError)) return false;
            const novosErros: Partial<Record<keyof ProfessorFormData, string>> = {};
            error.inner.forEach((item) => {
                const campo = item.path as keyof ProfessorFormData | undefined;
                if (campo && !novosErros[campo]) novosErros[campo] = item.message;
            });
            setErrors(novosErros);
            return false;
        }
    }

    async function gravarAlteracoes() {
        if (!(await validarCampos())) return;
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const payload: CriarProfessorDTO = {
                nome: formData.nome.trim(), cpf: formData.cpf.replace(/\D/g, ""), data_nascimento: formData.dataNascimento,
                logradouro: formData.logradouro.trim(), numero: formData.numero.trim(), bairro: formData.bairro.trim(),
                cidade_id: formData.cidade_id, estado: formData.uf, cep: formData.cep.trim(), curso_id: formData.curso_id,
                faculdade_id: formData.faculdade_id, curso_nome: formData.curso_nome, faculdade_nome: formData.faculdade_nome,
                cidade_nome: formData.cidade_nome, uf_nome: formData.uf,
            };
            await professorApi.criar(payload);
            setSuccessMessage("Professor cadastrado com sucesso!");
            setTimeout(() => navigate("/professores/lista"), 900);
        } catch (error) {
            const mensagem = getMensagemErro(error, "Erro ao cadastrar professor.");
            if (mensagem.toLowerCase().includes("cpf")) setErrors({ cpf: mensagem });
            else setErrorMessage(mensagem);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card.Root sx={{ overflow: "visible", backgroundColor: "background.default" }}>
            <Card.Header>Cadastro de Professor</Card.Header>
            <Card.Content>
                {(successMessage || errorMessage) && <Alert severity={errorMessage ? "error" : "success"} sx={{ mb: 2 }}>{errorMessage || successMessage}</Alert>}
                <Stack gap={2}>
                    <ProfessorFormFields data={formData} errors={errors} cursoOptions={cursoOptions} cidadeOptions={cidadeOptions}
                        onChange={handleInputChange} onSearchCurso={handleSearchCurso}
                        onSearchCidade={(query) => void handleSearchCidade(query)} onSelectCurso={handleSelectCurso}
                        onSelectCidade={handleSelectCidade} loadingCursos={loadingCursos} loadingCidades={loadingCidades} required />
                    <Stack direction={{ xs: "column-reverse", sm: "row" }} justifyContent="flex-end" gap={1}
                        sx={{ "& > button": { width: { xs: "100%", sm: 75 } } }}>
                        <Button variant="outlined" onClick={() => navigate("/professores/lista")} disabled={isLoading}>Cancelar</Button>
                        <Button variant="contained" onClick={gravarAlteracoes} isLoading={isLoading}>Salvar</Button>
                    </Stack>
                </Stack>
            </Card.Content>
        </Card.Root>
    );
}
