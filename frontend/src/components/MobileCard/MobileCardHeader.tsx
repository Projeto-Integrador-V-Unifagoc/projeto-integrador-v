import type { ReactNode } from "react";

import { 
    CardHeader as MuiCardHeader, 
    Typography, 
    type CardProps as MuiCardProps 
} from "@mui/material";

interface CardProps extends MuiCardProps {
    children?: ReactNode
    matricula: number
}

export default function Header({ children, matricula, ...rest }: CardProps) {
    return (
        <MuiCardHeader
            sx={(theme) => ({
                backgroundColor: theme.palette.grey[50],
                borderBottom: `1px solid ${theme.palette.grey[200]}`,
                py: 1,
                px: 2,
            })}
            title={
                <Typography fontWeight="bold" fontSize={14}>
                    Matrícula: {matricula}
                </Typography>
            }
            action={children}
            {...rest}
        />
    )
}
