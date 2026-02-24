import { Stack, type StackProps } from "@mui/material"

export function Header(props: StackProps) {
    const { children, ...rest } = props

    return (
        <Stack
            component="header"
            height="44px"
            position="absolute"
            direction="row"
            top={0}
            left={0}
            right={0}
            display="flex"
            alignItems="center"
            padding="16px"
            sx={(theme) => ({
                backgroundColor: theme.palette.background.default,
                color: theme.palette.text.secondary,
                borderBottom: `1px solid ${theme.palette.grey[200]}`,
                display: 'flex',
                justifyContent: 'space-between'
            })}
        >
            {children}
        </Stack>
    )
}
