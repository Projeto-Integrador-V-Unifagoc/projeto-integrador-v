import type { ReactNode } from "react";

import {
    Card as MuiCard, 
    type CardProps as MuiCardProps 
} from "@mui/material";


interface CardProps extends MuiCardProps {
    children: ReactNode
}

export default function Root({ children, ...rest }: CardProps){
    return (
        <MuiCard
            sx={(theme) => ({
                backgroundColor: theme.palette.background.paper,
                borderRadius: '12px',
                width: '100%',
                transition: 'all 0.2s ease',
                border: `1px solid ${theme.palette.grey[200]}`,
                mt: '10px',
            })}
            {...rest}
        >
            {children}
        </MuiCard>
    )
}
