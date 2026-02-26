import type { ReactNode } from "react";

import {
    Typography,
    type CardProps as MuiCardProps,
} from "@mui/material";


interface CardProps extends MuiCardProps {
    children: ReactNode
}

export function Title({ children,  }: CardProps) {
    return (
        <Typography
            sx={(theme) => ({
                color: theme.palette.text.secondary,
                fontWeight: 'bold',
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'space-between'
            })}
            variant="body2"
        >
            {children}
        </Typography>
    )
}