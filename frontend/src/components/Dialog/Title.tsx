import { Typography, type TypographyProps } from "@mui/material"

export function Title(props: TypographyProps) {
    return (
        <Typography
            component="h6"
            variant="body2"
            sx={{
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
            }}
            {...props}
        />
    )
}
