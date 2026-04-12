import { MenuItem, type TextFieldProps } from "@mui/material";
import TextField from "../TextField";
import { useCidade } from "../../hooks/use-cidade";
import { useEffect, useState } from "react";
import type { CidadeModel } from "../../models/cidade-model";
import { theme } from "../../theme";

type DropDownCidadesProps = Omit<TextFieldProps, "onChange"> & {
    value: number | string | ''
    onChange: (value: string) => void
}


export default function DropDownCidades({
    value,
    onChange,
    ...rest
}: DropDownCidadesProps) {
    const { carregando, listarCidades } = useCidade()
    const [cidades, setCidades] = useState<CidadeModel[]>([])

    useEffect(() => {
        async function carregar() {
            const data = await listarCidades()
            console.log(data)
            setCidades(data)
        }
        carregar()
    }, [])

    return (
        <TextField
            label='Cidade'
            InputLabelProps={{ shrink: true }}
            select
            fullWidth
            value={value}
            onChange={(e) => onChange(String(e.target.value))}
            SelectProps={{
                MenuProps: {
                    PaperProps: {
                        sx: {
                            maxHeight: 300,
                            overflow: 'auto',
                            borderRadius: 3,
                            backgroundColor: "background.default"
                        }
                    }
                }
            }}
            {...rest}
        >
            {carregando ? (
                <MenuItem disabled>Carregando...</MenuItem>
            ) : (
                cidades.map((cidade) => (
                    <MenuItem
                        key={cidade.id}
                        value={cidade.ibge}
                        sx={{
                            backgroundColor: `${theme.palette.background.default}`,
                            borderRadius: '8px',
                        }}
                    >
                        {cidade.nome} - {cidade.uf}
                    </MenuItem>
                ))
            )}
        </TextField>
    );
}