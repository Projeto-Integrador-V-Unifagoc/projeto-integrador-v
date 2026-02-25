import { 
    Box, 
    Stack, 
    Typography 
} from "@mui/material";

import NoDataImage from '../../../public/assets/nodata.svg'


export default function NoData() {
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
                    height: 270,
                    width: 270,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: theme.palette.background.default,
                    borderRadius: "50%",
                    p: 3
                })}
            >
                <img src={NoDataImage} alt="Sem dados" />
            </Box>
            <Stack
                display='flex'
                justifyContent='center'
                alignItems='center'
                mt={1}
            >
                <Typography variant="body1" fontWeight="bold">Nenhum registro encontrado</Typography>
                <Typography variant="body2" color="textDisabled">Tente outra pesquisa ou adicione um novo registro.</Typography>
            </Stack>
        </Box>
    )
}