import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Stack } from "@mui/material";
import { ValidationError } from "yup";

import { Card } from "../../components/Card";
import Button from "../../components/Button";
import type { SelectOption } from "../../components/SearchableSelect/SearchableSelect";
import { professorApi } from "../../services/professor-api";
import { disciplinaApi } from "../../services/disciplina-api";
import { cursoDisciplinaApi } from "../../services/curso-disciplina-api";
import { cursoApi } from "../../services/curso-api";
import { faculdadeApi } from "../../services/faculdade-api";
import { cidadeApi } from "../../services/cidade-api";
import { useViaCep } from "../../hooks/use-cep";
import type { CidadeModel } from "../../models/cidade-model";
import type { DisciplinaResponse } from "../../models/disciplina-model";
import type { CursoDisciplinaResponse } from "../../models/curso-disciplina-model";
import type { CursoResponse } from "../../models/curso-model";
import type { FaculdadeResponse } from "../../models/faculdade-model";
import type { CriarProfessorDTO } from "../../models/professor-model";
import ProfessorFormFields from "./ProfessorFormFields";
import { professorSchema } from "../../validators/professor-schema";
import { sugerirFaculdade } from "./sugerir-faculdade";
import {
    initialProfessorFormData,
    type DisciplinaSelecionada,
    type ProfessorFormData,
} from "./professor-form-model";

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
    const [disciplinas, setDisciplinas] = useState<DisciplinaResponse[]>([]);
    const [cursoDisciplinas, setCursoDisciplinas] = useState<CursoDisciplinaResponse[]>([]);
    const [cursos, setCursos] = useState<CursoResponse[]>([]);
    const [faculdades, setFaculdades] = useState<FaculdadeResponse[]>([]);
    const [cidades, setCidades] = useState<CidadeModel[]>([]);
    const [cidadeOptions, setCidadeOptions] = useState<SelectOption[]>([]);
    const [loadingCidades, setLoadingCidades] = useState(false);
    const { buscarCep, carregando: buscandoCep } = useViaCep();

    useEffect(() => {
        void carregarOpcoesIniciais();
        // A carga inicial deve ocorrer uma única vez ao abrir o cadastro.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const mapearCidades = (data: CidadeModel[]) => data.map((cidade) => ({ id: String(cidade.ibge), label: cidade.nome, sublabel: cidade.uf }));

    async function carregarOpcoesIniciais() {
        setLoadingCidades(true);
        try {
            const [disciplinasResponse, cursoDisciplinasResponse, cursosResponse, faculdadesResponse, cidadesResponse] = await Promise.all([
                disciplinaApi.listarDisciplinas(),
                cursoDisciplinaApi.listarCursoDisciplinas(),
                cursoApi.listarCursos(),
                faculdadeApi.listarFaculdades(),
                cidadeApi.buscarCidades(),
            ]);
            setDisciplinas(disciplinasResponse);
            setCursoDisciplinas(cursoDisciplinasResponse);
            setCursos(cursosResponse);
            setFaculdades(faculdadesResponse);
            setCidades(cidadesResponse);
            setCidadeOptions(mapearCidades(cidadesResponse));
        } catch (error) {
            setErrorMessage(getMensagemErro(error, "Não foi possível carregar as opções do cadastro."));
        } finally {
            setLoadingCidades(false);
        }
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

    function handleChangeDisciplinas(selecionadas: DisciplinaSelecionada[]) {
        setFormData((previous) => {
            const proximo: ProfessorFormData = {
                ...previous,
                disciplinasSelecionadas: selecionadas,
                disciplinaIds: selecionadas.map((disciplina) => disciplina.id),
            };
            if (previous.faculdadeSugerida) {
                const sugestao = sugerirFaculdade(proximo.disciplinaIds, cursoDisciplinas, cursos);
                proximo.faculdade_id = sugestao?.id || "";
            }
            return proximo;
        });
        clearError("disciplinaIds");
    }

    function handleChangeFaculdade(faculdadeId: string) {
        setFormData((previous) => ({ ...previous, faculdade_id: faculdadeId, faculdadeSugerida: false }));
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

    async function handleBuscarCep() {
        const resultado = await buscarCep(formData.cep);
        if (!resultado) {
            setErrors((previous) => ({ ...previous, cep: "CEP não encontrado." }));
            return;
        }

        const cidade = await cidadeApi.buscarCidadePorIbge(String(resultado.ibge));

        setFormData((previous) => ({
            ...previous,
            logradouro: resultado.logradouro || previous.logradouro,
            bairro: resultado.bairro || previous.bairro,
            uf: resultado.uf || previous.uf,
            cidade_id: cidade ? String(cidade.ibge) : previous.cidade_id,
            cidade_nome: cidade ? cidade.nome : previous.cidade_nome,
        }));

        setErrors((previous) => ({
            ...previous,
            cep: undefined,
            uf: undefined,
            cidade_id: cidade ? undefined : "Cidade do CEP não cadastrada — selecione manualmente.",
        }));
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
                cidade_id: formData.cidade_id, estado: formData.uf, cep: formData.cep.trim(),
                disciplinaIds: formData.disciplinaIds, faculdade_id: formData.faculdade_id || undefined,
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
                    <ProfessorFormFields data={formData} errors={errors} disciplinaOptions={disciplinas} faculdadeOptions={faculdades} cidadeOptions={cidadeOptions}
                        onChange={handleInputChange} onChangeDisciplinas={handleChangeDisciplinas} onChangeFaculdade={handleChangeFaculdade}
                        onSearchCidade={(query) => void handleSearchCidade(query)}
                        onSelectCidade={handleSelectCidade} onBuscarCep={() => void handleBuscarCep()}
                        loadingCidades={loadingCidades} loadingCep={buscandoCep} required />
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
