import {
    Autocomplete,
    CircularProgress,
    TextField
} from "@mui/material"

import { useEffect, useState } from "react"
import { useCidade } from "../../hooks/use-cidade"
import type { CidadeModel } from "../../models/cidade-model"

type Props = {
    value: CidadeModel | null
    onChange: (cidade: CidadeModel | null) => void
    disabled?: boolean
}

export default function DropDownCidades({
    value,
    onChange,
    disabled = false
}: Props) {

    const { listarCidades, carregando } = useCidade()

    const [inputValue, setInputValue] = useState("")
    const [cidades, setCidades] = useState<CidadeModel[]>([])

    useEffect(() => {

        async function buscar() {

            if (inputValue.length < 2) {
                setCidades([])
                return
            }

            const data = await listarCidades({
                nome: inputValue
            })

            setCidades(data)
        }

        buscar()

    }, [inputValue])

    return (
        <Autocomplete
            options={cidades}
            value={value}
            disabled={disabled}
            inputValue={value ? `${value.nome}` : inputValue}
            loading={carregando}
            getOptionLabel={(option) =>
                `${option.nome} - ${option.uf}`
            }
            isOptionEqualToValue={(option, value) => 
                option.ibge === value.ibge
            }
            onInputChange={(_, newInputValue) => {
                setInputValue(newInputValue)
            }}
            onChange={(_, newValue) => {
                onChange(newValue)
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Cidade"
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {carregando ? (
                                    <CircularProgress size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                            </>
                        )
                    }}
                />
            )}
            slotProps={{
                paper: {
                    sx: {
                        backgroundColor: "#FFF"
                    }
                }
            }}
        />
    )
}
