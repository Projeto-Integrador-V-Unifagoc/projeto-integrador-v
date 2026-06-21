import { Stack, type StackProps } from "@mui/material"
import { theme } from "../../theme"

export function Footer({ children }: StackProps) {
    return (
        <Stack
            component="footer"
            position="absolute"
            direction={{ xs: "column-reverse", sm: "row" }}
            alignItems="center"
            bottom={0}
            left={0}
            right={0}
            padding="8px 16px"
            borderTop={`solid 1px ${theme.palette.grey[300]}`}
            justifyContent={"flex-end"}
            gap={1}
            minHeight={{ xs: "96px", sm: "48px" }}
            sx={{
                backgroundColor: '#F4F4F4',
                "& > button": { width: { xs: "100%", sm: "auto" }, minWidth: 88 }
            }}
        >
            {children}
        </Stack>
    )
}
