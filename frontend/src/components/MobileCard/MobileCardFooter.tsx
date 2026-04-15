import { CardContent, Typography } from "@mui/material";

export function Footer() {
    return (
        <CardContent
            sx={(theme) => ({
                borderTop: `1px solid ${theme.palette.grey[200]}`,
                py: 1,
                px: 2,
            })}
        >
            <Typography fontSize={12} color="text.secondary">
                Não sei o que colocar aqui ainda
            </Typography>
        </CardContent>
    )
}