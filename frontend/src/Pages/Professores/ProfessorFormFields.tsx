import { Autocomplete, Chip, Grid, MenuItem, Stack } from "@mui/material";

import SearchableSelect, {
    type SelectOption,
} from "../../components/SearchableSelect/SearchableSelect";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import type { DisciplinaSelecionada, ProfessorFormData } from "./professor-form-model";

type ProfessorFormErrors = Partial<Record<keyof ProfessorFormData, string>>;

interface ProfessorFormFieldsProps {
    data: ProfessorFormData;
    errors: ProfessorFormErrors;
    disciplinaOptions: DisciplinaSelecionada[];
    faculdadeOptions: { id: string; nome: string }[];
    cidadeOptions: SelectOption[];
    onChange: (field: keyof ProfessorFormData, value: string) => void;
    onChangeDisciplinas: (selecionadas: DisciplinaSelecionada[]) => void;
    onChangeFaculdade: (faculdadeId: string) => void;
    onSearchCidade: (query: string) => void;
    onSelectCidade: (option: SelectOption) => void;
    onBuscarCep: () => void;
    loadingCidades?: boolean;
    loadingCep?: boolean;
    required?: boolean;
}

const helper = (message?: string) => message || " ";

export default function ProfessorFormFields({
    data,
    errors,
    disciplinaOptions,
    faculdadeOptions,
    cidadeOptions,
    onChange,
    onChangeDisciplinas,
    onChangeFaculdade,
    onSearchCidade,
    onSelectCidade,
    onBuscarCep,
    loadingCidades = false,
    loadingCep = false,
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
                <Autocomplete
                    multiple
                    options={disciplinaOptions}
                    getOptionLabel={(option) => option.nome}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={data.disciplinasSelecionadas}
                    onChange={(_event, value) => onChangeDisciplinas(value)}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                            <Chip label={option.nome} size="small" {...getTagProps({ index })} />
                        ))
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Disciplinas"
                            placeholder="Buscar disciplinas"
                            required={required}
                            error={Boolean(errors.disciplinaIds)}
                            helperText={helper(errors.disciplinaIds)}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    height: "auto",
                                    minHeight: 36,
                                    flexWrap: "wrap",
                                    paddingTop: "4px",
                                    paddingBottom: "4px",
                                },
                            }}
                        />
                    )}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <TextField
                    select
                    label="Faculdade"
                    value={data.faculdade_id}
                    onChange={(event) => onChangeFaculdade(event.target.value)}
                    required={required}
                    error={Boolean(errors.faculdade_id)}
                    helperText={helper(errors.faculdade_id)}
                >
                    {faculdadeOptions.map((faculdade) => (
                        <MenuItem key={faculdade.id} value={faculdade.id}>
                            {faculdade.nome}
                        </MenuItem>
                    ))}
                </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                    {field("cep", "CEP", {
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            onChange("cep", event.target.value.replace(/\D/g, "").slice(0, 8)),
                        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                onBuscarCep();
                            }
                        },
                        inputProps: { inputMode: "numeric", maxLength: 8 },
                        sx: { flex: 1 },
                    })}
                    <Button
                        variant="outlined"
                        sx={{ minWidth: 130, height: 36, flexShrink: 0 }}
                        onClick={onBuscarCep}
                        isLoading={loadingCep}
                        disabled={data.cep.replace(/\D/g, "").length !== 8}
                    >
                        Buscar CEP
                    </Button>
                </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{field("logradouro", "Logradouro")}</Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>{field("bairro", "Bairro")}</Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>{field("numero", "Número")}</Grid>

            <Grid size={{ xs: 12, sm: 6, md: 7 }}>
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
        </Grid>
    );
}
