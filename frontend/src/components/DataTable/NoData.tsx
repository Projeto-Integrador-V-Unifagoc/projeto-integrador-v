import { 
    Box, 
    Stack, 
    Typography 
} from "@mui/material";

import NoDataImage from '../../../public/assets/nodata.svg'


interface NoDataProps {
    title?: string;
    description?: string;
}

export default function NoData({
    title = "Nenhum registro encontrado",
    description = "Tente outra pesquisa ou adicione um novo registro.",
}: NoDataProps) {
    return (
        <Box
            sx={{
                height: "100%",
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Box
                component='div'
                sx={(theme) => ({
                    height: { xs: 150, sm: 210 },
                    width: { xs: 150, sm: 210 },
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: theme.palette.background.default,
                    borderRadius: "50%",
                    p: 3
                })}
            >
                <Box component="img" src={NoDataImage} alt="" aria-hidden="true" sx={{ maxWidth: "100%", maxHeight: "100%" }} />
            </Box>
            <Stack
                display='flex'
                justifyContent='center'
                alignItems='center'
                mt={1}
            >
                <Typography variant="body1" fontWeight="bold">{title}</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" px={2}>{description}</Typography>
            </Stack>
        </Box>
    )
}
