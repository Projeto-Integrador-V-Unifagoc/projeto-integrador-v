import { Typography, type TypographyProps } from "@mui/material";
import type { ReactNode } from "react";

interface TitleProps extends TypographyProps {
    children: ReactNode
}

export default function Title({ children, ...rest }: TitleProps) {
    return (
        <>
        <Typography 
            fontWeight='bold' 
            variant="subtitle1"
            mt={1} 
            {...rest}
        >
            {children}
        </Typography>
        
        </>
    )
}