import { MenuItem, type TextFieldProps } from "@mui/material";

import { PERIODOS } from "../../enums/periodos";
import TextField from "../TextField";
import { theme } from "../../theme";

type DropDownPeriodosProps = Omit<TextFieldProps, "value" | "onChange"> & {
    value: typeof PERIODOS[number]['value'] | '';
    onChange: (value: typeof PERIODOS[number]['value']) => void;
};

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
            onChange={(e) => onChange(e.target.value as typeof PERIODOS[number]['value'])}
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
            {PERIODOS.map((periodo) => (
                <MenuItem
                    key={periodo.value}
                    value={periodo.value}
                    sx={{
                        backgroundColor: `${theme.palette.background.default}`,
                        borderRadius: '8px'
                    }}
                >
                    {periodo.label}
                </MenuItem>
            ))}
        </TextField>
    );
}
