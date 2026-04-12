import { useEffect, useState } from "react";
import { MenuItem, type TextFieldProps } from "@mui/material";
import TextField from "../TextField";
import { useCurso } from "../../hooks/use-curso";


type Curso = {
    id: number;
    nome: string;
};

type DropDownCursosProps = TextFieldProps & {
    value: string;
    onChange: (value: string) => void;
};

export default function DropDownCursos({
    value,
    onChange,
    ...rest
}: DropDownCursosProps) {

    const { listarCursos, carregando } = useCurso();
    const [cursos, setCursos] = useState<Curso[]>([]);

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
                    <MenuItem key={curso.id} value={curso.nome}>
                        {curso.nome}
                    </MenuItem>
                ))
            )}
        </TextField>
    );
}