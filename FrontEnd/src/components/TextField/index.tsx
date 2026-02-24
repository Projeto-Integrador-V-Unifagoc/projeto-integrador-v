import {
    TextField as MuiTextField,
    type TextFieldProps,
} from "@mui/material"

export default function TextField(props: TextFieldProps) {
    const {children, ...rest} = props

    return (
        <MuiTextField
            {...rest}
        />
    )
}