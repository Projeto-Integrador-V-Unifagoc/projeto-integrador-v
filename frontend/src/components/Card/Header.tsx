import type { ReactNode } from "react";

import {
    CardHeader,
    type CardProps as MuiCardProps,
} from "@mui/material";

import { theme } from "../../theme";


interface CardProps extends MuiCardProps {
    children: ReactNode
}

export function Header({ children }: CardProps) {
    return (
        <CardHeader
            title={children}
            titleTypographyProps={{ variant: 'h6' }}
            sx={(theme) => ({
                borderBottom: `1px solid ${theme.palette.grey[200]}`,
                backgroundColor: theme.palette.grey[100],
                height: 30
            })}
        >
        </CardHeader>
    )
}