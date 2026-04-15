import { useEffect, useState } from "react";
import { MenuItem, type TextFieldProps } from "@mui/material";
import TextField from "../TextField";
import { useCurso } from "../../hooks/use-curso";
import type { CursoResponse } from "../../models/curso-model";

type DropDownCursosProps = Omit<TextFieldProps, "onChange"> & {
  value: string
  onChange: (value: string) => void
  optionValue?: "id" | "nome"
}

export default function DropDownCursos({
  value,
  onChange,
  optionValue = "nome",
  ...rest
}: DropDownCursosProps) {
  const { listarCursos, carregando } = useCurso();
  const [cursos, setCursos] = useState<CursoResponse[]>([]);

  useEffect(() => {
    async function carregarCursos() {
      const data = await listarCursos();
      setCursos(data);
    }

    carregarCursos();
  }, []);

  return (
    <TextField
      label="Curso"
      InputLabelProps={{ shrink: true }}
      select
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
        cursos.map((curso) => (
          <MenuItem
            key={curso.id}
            value={optionValue === "id" ? curso.id : curso.nome}
          >
            {curso.nome}
          </MenuItem>
        ))
      )}
    </TextField>
  );
}
