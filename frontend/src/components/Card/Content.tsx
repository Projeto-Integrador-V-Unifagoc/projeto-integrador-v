import type { ReactNode } from "react";

import {
    Box,
    CardContent,
    type CardProps as MuiCardProps,
} from "@mui/material";


interface CardProps extends MuiCardProps {
    children: ReactNode
}


export function Content({ children, ...rest }: CardProps) {
    return (
        <CardContent
            {...rest}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                }}
            >
                {children}
            </Box>
        </CardContent>
    )
}