import { Box, type BoxProps } from "@mui/material";
import type { ReactNode } from "react";

interface ContentProps extends BoxProps {
    children: ReactNode
}

export default function Content({ children, ...rest }: ContentProps) {
    return (
        <Box
            {...rest}
        >
            {children}
        </Box>
    )
}