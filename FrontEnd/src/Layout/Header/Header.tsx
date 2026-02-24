import Button from "../../components/Button";
import UserMenu from "./UserMenu";

import { 
    AppBar, 
    Box, 
    IconButton, 
    Stack, 
    Toolbar, 
    Typography 
} from "@mui/material";

import { Menu } from "lucide-react";


export default function Header() {
    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar
                position="fixed"
                sx={(theme) => ({
                    backgroundColor: theme.palette.background.default,
                    boxShadow: 'none',
                    borderBottom: `1px solid ${theme.palette.grey[200]}`,
                    height: 49,
                    display: 'flex',
                    justifyContent: 'center'
                })}
            >
                <Toolbar>
                    <IconButton
                        size="small"
                        edge='start'
                        aria-label="menu"
                        sx={{ mr: 2 }}
                    >
                        <Menu size={19} />
                    </IconButton>
                    <Typography

                        component='div'
                        sx={(theme) => ({
                            color: theme.palette.primary.main,
                            flexGrow: 1,
                            fontWeight: 'bold',
                        })}

                    >
                        UniEduca
                    </Typography>
                    <Stack  flexDirection='row' >
                        <Button sx={{ width: 'auto' }} >
                            <UserMenu />
                            João Pedro Vidal
                        </Button>
                    </Stack>
                </Toolbar>
            </AppBar>
        </Box>
    )
}