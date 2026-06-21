import { Grid } from "@mui/material";

import SearchableSelect, {
    type SelectOption,
} from "../../components/SearchableSelect/SearchableSelect";
import TextField from "../../components/TextField";
import type { ProfessorFormData } from "./professor-form-model";

type ProfessorFormErrors = Partial<Record<keyof ProfessorFormData, string>>;

interface ProfessorFormFieldsProps {
    data: ProfessorFormData;
    errors: ProfessorFormErrors;
    cursoOptions: SelectOption[];
    cidadeOptions: SelectOption[];
    onChange: (field: keyof ProfessorFormData, value: string) => void;
    onSearchCurso: (query: string) => void;
    onSearchCidade: (query: string) => void;
    onSelectCurso: (option: SelectOption) => void;
    onSelectCidade: (option: SelectOption) => void;
    loadingCursos?: boolean;
    loadingCidades?: boolean;
    required?: boolean;
}

const helper = (message?: string) => message || " ";

export default function ProfessorFormFields({
    data,
    errors,
    cursoOptions,
    cidadeOptions,
    onChange,
    onSearchCurso,
    onSearchCidade,
    onSelectCurso,
    onSelectCidade,
    loadingCursos = false,
    loadingCidades = false,
    required = false,
}: ProfessorFormFieldsProps) {
    const field = (
        name: keyof ProfessorFormData,
        label: string,
        options: Record<string, unknown> = {},
    ) => (
        <TextField
            label={label}
            value={data[name]}
            onChange={(event) => onChange(name, event.target.value)}
            error={Boolean(errors[name])}
            helperText={helper(errors[name])}
            required={required}
            {...options}
        />
    );

    return (
        <Grid container columnSpacing={2} rowSpacing={0.5}>
            <Grid size={{ xs: 12, sm: 6, md: 6 }}>{field("nome", "Nome")}</Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {field("cpf", "CPF", {
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        onChange("cpf", event.target.value.replace(/\D/g, "").slice(0, 11)),
                    inputProps: { inputMode: "numeric", maxLength: 11 },
                })}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {field("dataNascimento", "Nascimento", { type: "date", InputLabelProps: { shrink: true } })}
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <SearchableSelect
                    label="Curso"
                    placeholder="Buscar curso"
                    value={data.curso_id}
                    displayValue={data.curso_nome}
                    options={cursoOptions}
                    onSearch={onSearchCurso}
                    onSelect={onSelectCurso}
                    loading={loadingCursos}
                    error={Boolean(errors.curso_id)}
                    helperText={helper(errors.curso_id)}
                    required={required}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <TextField
                    label="Faculdade"
                    value={data.faculdade_nome}
                    disabled
                    required={required}
                    error={Boolean(errors.faculdade_id)}
                    helperText={errors.faculdade_id || (!data.faculdade_nome ? "Definida automaticamente pelo curso" : " ")}
                />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 6 }}>{field("logradouro", "Logradouro")}</Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>{field("bairro", "Bairro")}</Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>{field("numero", "Número")}</Grid>

            <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <SearchableSelect
                    label="Cidade"
                    placeholder="Buscar cidade"
                    value={data.cidade_id}
                    displayValue={data.cidade_nome}
                    options={cidadeOptions}
                    onSearch={onSearchCidade}
                    onSelect={onSelectCidade}
                    loading={loadingCidades}
                    error={Boolean(errors.cidade_id)}
                    helperText={helper(errors.cidade_id)}
                    required={required}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 2, md: 2 }}>
                {field("uf", "UF", {
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange("uf", event.target.value.toUpperCase()),
                    inputProps: { maxLength: 2 },
                })}
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 4 }}>
                {field("cep", "CEP", {
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        onChange("cep", event.target.value.replace(/\D/g, "").slice(0, 8)),
                    inputProps: { inputMode: "numeric", maxLength: 8 },
                })}
            </Grid>
        </Grid>
    );
}
