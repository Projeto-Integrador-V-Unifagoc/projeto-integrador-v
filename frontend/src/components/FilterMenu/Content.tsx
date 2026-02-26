import type { ReactNode } from "react";

import { Stack, type StackProps } from "@mui/material";

interface ContentProps extends StackProps {
    children: ReactNode
}

export default function Content(props: ContentProps) {
    const { children, ...rest } = props;

    return (
        <Stack
            spacing={1}
            px={1}
            {...rest}
        >
            {children}
        </Stack>
    );
}