import type { ReactNode } from "react";

import {
    Card as MuiCard,
    type CardProps as MuiCardProps,
} from "@mui/material";

interface CardProps extends MuiCardProps {
    children: ReactNode
}

export function Root({ children, ...rest }: CardProps) {

    return (
        <MuiCard
            sx={(theme) => ({
                background: theme.palette.background.default
            })}
            {...rest}
        >
            {children}
        </MuiCard>
    )
}