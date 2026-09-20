import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    AppBar,
    Box,
    Button,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    Toolbar,
    Typography,
} from "@mui/material";
import { GraduationCap, LogIn, Menu as MenuIcon, X } from "lucide-react";

import type { SiteMenuItem } from "../../services/site-api";
import { COR_DESTAQUE, COR_INSTITUCIONAL, URL_PORTAL } from "./conteudo";
import { propsDeLink } from "./navegacao";

interface HeaderPublicoProps {
    menu: SiteMenuItem[];
    nomeSite: string;
    urlInscricao: string;
    onNavegar: (url: string) => void;
}

export default function HeaderPublico({ menu, nomeSite, urlInscricao, onNavegar }: HeaderPublicoProps) {
    const [aberto, setAberto] = useState(false);
    const [comFundo, setComFundo] = useState(false);
    const { pathname } = useLocation();

    useEffect(() => {
        const aoRolar = () => setComFundo(window.scrollY > 40);
        aoRolar();
        window.addEventListener("scroll", aoRolar, { passive: true });
        return () => window.removeEventListener("scroll", aoRolar);
    }, []);

    function ir(url: string) {
        setAberto(false);
        onNavegar(url);
    }

    function ativo(url: string): boolean {
        if (url === "/") return pathname === "/";
        return pathname === url || pathname.startsWith(`${url}/`);
    }

    const marca = nomeSite || "UniEduca";
    const inicio = marca.slice(0, 3);
    const fim = marca.slice(3);

    return (
        <>
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    bgcolor: "#ffffff",
                    borderBottom: "1px solid #e2e8ed",
                    boxShadow: comFundo ? "0 2px 14px rgba(16,24,40,.08)" : "none",
                    transition: "box-shadow 300ms ease",
                }}
            >
                <Toolbar sx={{ maxWidth: 1180, width: "100%", mx: "auto", px: { xs: 2, md: 4 }, minHeight: 72 }}>
                    <Stack
                        direction="row"
                        spacing={1.2}
                        alignItems="center"
                        {...propsDeLink("/", ir)}
                        sx={{ flexGrow: 1, cursor: "pointer", textDecoration: "none" }}
                    >
                        <Box
                            sx={{
                                width: 38,
                                height: 38,
                                borderRadius: 1.6,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: COR_INSTITUCIONAL,
                            }}
                        >
                            <GraduationCap size={21} color="#fff" />
                        </Box>

                        <Typography sx={{ fontSize: 21, fontWeight: 800, letterSpacing: .2, color: COR_INSTITUCIONAL }}>
                            {inicio}
                            <Box component="span" sx={{ color: COR_DESTAQUE }}>{fim}</Box>
                        </Typography>
                    </Stack>

                    <Stack direction="row" spacing={.5} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
                        {menu.map((item) => (
                            <Button
                                key={item.id}
                                {...propsDeLink(item.url, ir)}
                                sx={{
                                    textDecoration: "none",
                                    width: "auto",
                                    px: 1.8,
                                    height: 40,
                                    fontSize: 15,
                                    position: "relative",
                                    color: ativo(item.url) ? COR_DESTAQUE : "#3c4a55",
                                    fontWeight: ativo(item.url) ? 700 : 500,
                                    "&:hover": { color: COR_DESTAQUE, bgcolor: "transparent" },
                                    "&::after": ativo(item.url)
                                        ? {
                                              content: '""',
                                              position: "absolute",
                                              left: 14,
                                              right: 14,
                                              bottom: 4,
                                              height: 2,
                                              borderRadius: 2,
                                              bgcolor: COR_DESTAQUE,
                                          }
                                        : undefined,
                                }}
                            >
                                {item.rotulo}
                            </Button>
                        ))}

                        <Button
                            {...propsDeLink(URL_PORTAL, ir)}
                            sx={{
                                width: "auto",
                                px: 1.8,
                                height: 40,
                                fontSize: 15,
                                color: "#3c4a55",
                                textDecoration: "none",
                                "&:hover": { color: COR_DESTAQUE, bgcolor: "transparent" },
                            }}
                        >
                            <LogIn size={16} style={{ marginRight: 6 }} />
                            Portal
                        </Button>

                        <Button
                            variant="contained"
                            {...propsDeLink(urlInscricao, ir)}
                            sx={{
                                width: "auto",
                                ml: 1.5,
                                px: 3,
                                height: 42,
                                fontSize: 15,
                                borderRadius: 2,
                                bgcolor: COR_DESTAQUE,
                                color: "#fff",
                                textDecoration: "none",
                                "&:hover": { bgcolor: "#049ec9" },
                            }}
                        >
                            Inscreva-se
                        </Button>
                    </Stack>

                    <IconButton
                        onClick={() => setAberto(true)}
                        aria-label="Abrir menu"
                        sx={{ display: { xs: "flex", md: "none" }, color: COR_INSTITUCIONAL }}
                    >
                        <MenuIcon size={24} />
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Drawer anchor="right" open={aberto} onClose={() => setAberto(false)}>
                <Box sx={{ width: 280 }} role="presentation">
                    <Stack direction="row" justifyContent="space-between" alignItems="center" p={2}>
                        <Typography fontWeight={800} fontSize={19} color={COR_INSTITUCIONAL}>
                            {inicio}
                            <Box component="span" sx={{ color: COR_DESTAQUE }}>{fim}</Box>
                        </Typography>
                        <IconButton onClick={() => setAberto(false)} aria-label="Fechar menu">
                            <X size={20} />
                        </IconButton>
                    </Stack>

                    <List>
                        {menu.map((item) => (
                            <ListItemButton
                                key={item.id}
                                selected={ativo(item.url)}
                                {...propsDeLink(item.url, ir)}
                                sx={{ color: "inherit", textDecoration: "none" }}
                            >
                                <ListItemText primary={item.rotulo} />
                            </ListItemButton>
                        ))}
                        <ListItemButton {...propsDeLink(URL_PORTAL, ir)} sx={{ color: "inherit", textDecoration: "none" }}>
                            <ListItemText primary="Portal do aluno" />
                        </ListItemButton>
                    </List>

                    <Box px={2} pt={1}>
                        <Button
                            variant="contained"
                            {...propsDeLink(urlInscricao, ir)}
                            sx={{ width: "100%", height: 46, borderRadius: 2, fontSize: 15, textDecoration: "none" }}
                        >
                            Inscreva-se
                        </Button>
                    </Box>
                </Box>
            </Drawer>
        </>
    );
}
