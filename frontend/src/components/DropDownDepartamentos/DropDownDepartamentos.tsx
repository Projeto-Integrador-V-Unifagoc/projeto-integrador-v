import { useEffect, useState } from "react";
import { MenuItem, type TextFieldProps } from "@mui/material";
import TextField from "../TextField";
import { useDepartamento } from "../../hooks/use-departamento";
import type { DepartamentoResponse } from "../../models/departamento-model";

type DropDownDepartamentosProps = Omit<TextFieldProps, "onChange"> & {
  value: string
  onChange: (value: string) => void
}

export default function DropDownDepartamentos({
  value,
  onChange,
  ...rest
}: DropDownDepartamentosProps) {
  const { listarDepartamentos, carregando } = useDepartamento()
  const [departamentos, setDepartamentos] = useState<DepartamentoResponse[]>([])

  useEffect(() => {
    async function carregarDepartamentos() {
      const data = await listarDepartamentos()
      setDepartamentos(data)
    }

    carregarDepartamentos()
  }, [])

  return (
    <TextField
      label="Departamento"
      variant="standard"
      InputLabelProps={{ shrink: true }}
      select
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    >
      {carregando ? (
        <MenuItem disabled>Carregando...</MenuItem>
      ) : (
        departamentos.map((departamento) => (
          <MenuItem key={departamento.id} value={departamento.id}>
            {departamento.nome}
          </MenuItem>
        ))
      )}
    </TextField>
  )
}
