import { MenuItem, type TextFieldProps } from "@mui/material";
import { Periodos } from "../../enums/periodos";
import TextField from "../TextField";
import { theme } from "../../theme";

type DropDownPeriodosProps = TextFieldProps & {
    value: Periodos | ''
    onChange: (value: Periodos) => void
}

export default function DropDownPeriodos({
    value,
    onChange,
    ...rest
}: DropDownPeriodosProps) {
    return (
        <TextField
            label='Período'
            InputLabelProps={{
                shrink: true
            }}        
            select
            fullWidth
            value={value}
            onChange={(e) => onChange(e.target.value as Periodos)}
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
            {Object.values(Periodos).map((periodo) => (
                <MenuItem
                    key={periodo}
                    value={periodo}
                    sx={{
                        backgroundColor: `${theme.palette.background.default}`,
                        borderRadius: '8px'
                    }}                
                >
                    {periodo}
                </MenuItem>
            ))}
        </TextField>
    )
}