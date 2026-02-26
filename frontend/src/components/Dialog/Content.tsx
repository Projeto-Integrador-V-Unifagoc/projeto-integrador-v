import { Stack, type StackProps } from "@mui/material"

export function Content({ children, ...rest }: StackProps) {
    return (
        <Stack
            component='main'
            margin="44px 0 55.75px"
            overflow='auto'
            sx={(theme) => ({
                backgroundColor: theme.palette.background.default
            })}
        >
            <Stack
                padding="16px"
                {...rest}

            >
                {children}
            </Stack>
        </Stack>
    )
}

