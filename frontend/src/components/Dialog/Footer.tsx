import { Stack, type StackProps } from "@mui/material"
import { theme } from "../../theme"

export function Footer({ children }: StackProps) {
    return (
        <Stack
            component="footer"
            position="absolute"
            direction="row"
            alignItems="center"
            bottom={0}
            left={0}
            right={0}
            padding="8px 16px"
            borderTop={`solid 1px ${theme.palette.grey[300]}`}
            justifyContent={"flex-end"}
            gap={1}
            height="48px"
            sx={{ backgroundColor: '#F4F4F4' }}
        >
            {children}
        </Stack>
    )
}
