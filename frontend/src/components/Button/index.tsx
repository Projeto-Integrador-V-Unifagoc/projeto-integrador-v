import type { ReactNode } from "react";

import { 
    CircularProgress, 
    Button as MuiButton, 
    type ButtonProps as MuiButtonProps 
} from "@mui/material";

import { theme } from "../../theme";


interface ButtonProps extends MuiButtonProps {
    children: ReactNode,
    isLoading?: boolean, 
}

export default function Button(props: ButtonProps) {
    const { children, isLoading, disabled, ...rest } = props;

    return (
        <MuiButton
            disabled={isLoading || disabled}
            {...rest}
        >
            {isLoading ? <CircularProgress size={20} color="inherit" /> : children}
        </MuiButton>
    );
}