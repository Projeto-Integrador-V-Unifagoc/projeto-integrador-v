import { Stack } from "@mui/material";

import { theme } from "../../theme";
import Button from "../Button";

import { Search } from "lucide-react";

export default function Footer() {
    return (
        <Stack
            display='flex'
            justifyContent='flex-end'
            pr={1}
            flexDirection='row'
            alignItems='center'
            mt={1}
            gap={1}
            sx={{
                backgroundColor: '#F4F4F4',
                borderTop: `1px solid ${theme.palette.grey[200]}`,
                height: '45px'
            }}
        >
            <Button 
                color="error"
                variant="outlined"
                sx={(theme) => ({
                    backgroundColor: theme.palette.background.default
                })}    
            >
                Resetar
            </Button>
            <Button
                startIcon={<Search size={15}/>}
                variant="contained"
                sx={{
                    width: '100px'
                }}
            >
                Pesquisar
            </Button>
        </Stack>
    )
}