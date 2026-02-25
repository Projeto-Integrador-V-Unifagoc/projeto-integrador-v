import {
    TextField as MuiTextField,
    type TextFieldProps,
} from "@mui/material"

export default function TextField(props: TextFieldProps) {

    return (
        <MuiTextField
            {...props}
        />
    )
}