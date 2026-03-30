import { MenuItem } from "@mui/material";
import { Periodos } from "../../enums/periodos";
import TextField from "../TextField";
import { theme } from "../../theme";

interface DropDownPeriodosProps {
    value: Periodos | ''
    onChange: (value: Periodos) => void
}

export default function DropDownPeriodos({
    value,
    onChange
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