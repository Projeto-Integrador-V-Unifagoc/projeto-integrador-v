import { Cursos } from "../../enums/cursos";
import { MenuItem } from "@mui/material";
import TextField from "../TextField";
import { theme } from "../../theme";

interface DropDownCursosProps {
    value: Cursos | '';
    onChange: (value: Cursos) => void;
}

export default function DropDownCursos({
    value,
    onChange
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