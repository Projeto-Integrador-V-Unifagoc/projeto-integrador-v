import { Cursos } from "../../enums/cursos";
import { MenuItem, type TextFieldProps } from "@mui/material";
import TextField from "../TextField";
import { theme } from "../../theme";

type DropDownCursosProps = TextFieldProps & {
    value: Cursos | '';
    onChange: (value: Cursos) => void;
}

export default function DropDownCursos({
    value,
    onChange,
    ...rest
}: DropDownCursosProps) {

    return (
        <TextField
            label= 'Curso'
            InputLabelProps={{
                shrink: true
            }}
            select
            fullWidth
            value={value}
            onChange={(e) => onChange(e.target.value as Cursos)}
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
            {Object.values(Cursos).map((curso) => (
                <MenuItem
                    key={curso}
                    value={curso}
                    sx={{
                        backgroundColor: `${theme.palette.background.default}`,
                        borderRadius: '8px',
                    }}
                >
                    {curso}
                </MenuItem>
            ))}
        </TextField>
    );
}