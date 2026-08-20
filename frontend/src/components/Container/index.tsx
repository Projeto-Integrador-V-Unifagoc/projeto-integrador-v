import { 
    Container as MuiContainer, 
    type ContainerProps 
} from "@mui/material";


export default function Container(props: ContainerProps) {
    const { children, ...rest } = props

    return (
        <MuiContainer
            maxWidth={false}
            sx={(theme) => ({
                border: `1px solid ${theme.palette.grey[100]}`,
                borderRadius: '8px',
                height: '100%', 
            })}
            {...rest}
        >
            {children}
        </MuiContainer>
    )
}