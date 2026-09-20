import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    AppBar,
    Box,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { AccountCircle } from "@mui/icons-material";
import {
    ExternalLink,
    Images,
    LayoutDashboard,
    LogOut,
    Menu as MenuIcon,
    Monitor,
    Newspaper,
    Users,
    GraduationCap,
    ListOrdered,
} from "lucide-react";

const CHAVE_MENU_EXPANDIDO = "@UniEduca:painelMenuExpandido";
const LARGURA_EXPANDIDA = 260;
const LARGURA_RECOLHIDA = 70;
const ALTURA_CABECALHO = 49;

export const ITENS_PAINEL = [
    { rotulo: "Visão geral", url: "/painel", Icone: LayoutDashboard },
    { rotulo: "Banners", url: "/painel/banners", Icone: Monitor },
    { rotulo: "Notícias", url: "/painel/noticias", Icone: Newspaper },
    { rotulo: "Galeria", url: "/painel/galeria", Icone: Images },
    { rotulo: "Cursos no site", url: "/painel/cursos", Icone: GraduationCap },
    { rotulo: "Menu do site", url: "/painel/menu", Icone: ListOrdered },
    { rotulo: "Usuários", url: "/painel/usuarios", Icone: Users },
];

export function usuarioLogado(): { nome?: string; email?: string; tipo_usuario?: string } | null {
    try {
        const bruto = localStorage.getItem("@UniEduca:user");
        return bruto ? JSON.parse(bruto) : null;
    } catch {
        return null;
    }
}

export function ehAdministrativo(): boolean {
    const tipo = String(usuarioLogado()?.tipo_usuario ?? "").trim().toLowerCase();
    return tipo === "administrador" || tipo === "secretaria";
}

function lerMenuExpandido(): boolean {
    try {
        const salvo = localStorage.getItem(CHAVE_MENU_EXPANDIDO);
        return salvo === null ? true : salvo === "true";
    } catch {
        return true;
    }
}

export default function PainelLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const theme = useTheme();
    const ehMobile = useMediaQuery(theme.breakpoints.down("md"));

    const [menuMobileAberto, setMenuMobileAberto] = useState(false);
    const [menuExpandido, setMenuExpandido] = useState(lerMenuExpandido);

    useEffect(() => {
        try {
            localStorage.setItem(CHAVE_MENU_EXPANDIDO, String(menuExpandido));
        } catch {
            return;
        }
    }, [menuExpandido]);

    const token = localStorage.getItem("@UniEduca:token");
    const usuario = usuarioLogado();

    if (!token || !usuario) {
        return <Navigate to="/painel/login" replace state={{ de: pathname }} />;
    }

    if (!ehAdministrativo()) {
        return <Navigate to="/painel/login" replace state={{ semPermissao: true }} />;
    }

    const larguraSidebar = menuExpandido ? LARGURA_EXPANDIDA : LARGURA_RECOLHIDA;

    function alternarMenu() {
        if (ehMobile) setMenuMobileAberto((aberto) => !aberto);
        else setMenuExpandido((expandido) => !expandido);
    }

    function fecharMenuMobile() {
        setMenuMobileAberto(false);
    }

    function sair() {
        localStorage.removeItem("@UniEduca:token");
        localStorage.removeItem("@UniEduca:user");
        navigate("/painel/login", { replace: true });
    }

    function ativo(url: string): boolean {
        if (url === "/painel") return pathname === "/painel";
        return pathname.startsWith(url);
    }

    function itemMenu({
        rotulo,
        Icone,
        expandido,
        selecionado,
        aoClicar,
    }: {
        rotulo: string;
        Icone: typeof LayoutDashboard;
        expandido: boolean;
        selecionado?: boolean;
        aoClicar: () => void;
    }) {
        return (
            <Tooltip
                key={rotulo}
                title={expandido ? "" : rotulo}
                placement="right"
                disableHoverListener={expandido}
            >
                <ListItemButton
                    onClick={aoClicar}
                    sx={(tema) => ({
                        justifyContent: expandido ? "initial" : "center",
                        borderRadius: 1,
                        mb: 0.3,
                        color: selecionado ? tema.palette.primary.main : tema.palette.text.primary,
                        backgroundColor: selecionado ? "rgba(5,181,230,.10)" : "transparent",
                        "&:hover": {
                            backgroundColor: selecionado ? "rgba(5,181,230,.16)" : tema.palette.grey[50],
                        },
                    })}
                >
                    <ListItemIcon
                        sx={(tema) => ({
                            minWidth: 0,
                            mr: expandido ? 2 : "auto",
                            justifyContent: "center",
                            color: selecionado ? tema.palette.primary.main : tema.palette.grey[400],
                        })}
                    >
                        <Icone size={17} />
                    </ListItemIcon>

                    <ListItemText
                        primary={rotulo}
                        sx={{ opacity: expandido ? 1 : 0, transition: "opacity 0.2s" }}
                        primaryTypographyProps={{
                            fontSize: 14,
                            noWrap: true,
                            fontWeight: selecionado ? 700 : 400,
                        }}
                    />
                </ListItemButton>
            </Tooltip>
        );
    }

    function menu(expandido: boolean) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <List component="nav" sx={{ flex: 1, px: 1 }}>
                    {ITENS_PAINEL.map(({ rotulo, url, Icone }) =>
                        itemMenu({
                            rotulo,
                            Icone,
                            expandido,
                            selecionado: ativo(url),
                            aoClicar: () => {
                                fecharMenuMobile();
                                navigate(url);
                            },
                        }),
                    )}
                </List>

                <Divider />

                <List sx={{ px: 1 }}>
                    {itemMenu({
                        rotulo: "Ver o site",
                        Icone: ExternalLink,
                        expandido,
                        aoClicar: () => window.open("/", "_blank"),
                    })}
                    {itemMenu({
                        rotulo: "Sair",
                        Icone: LogOut,
                        expandido,
                        aoClicar: sair,
                    })}
                </List>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex" }}>
            <CssBaseline />

            <AppBar
                position="fixed"
                sx={(tema) => ({
                    backgroundColor: tema.palette.background.default,
                    boxShadow: "none",
                    borderBottom: `1px solid ${tema.palette.grey[200]}`,
                    height: ALTURA_CABECALHO,
                    display: "flex",
                    justifyContent: "center",
                })}
            >
                <Toolbar>
                    <IconButton
                        size="small"
                        edge="start"
                        aria-label="menu"
                        sx={{ mr: 2 }}
                        onClick={alternarMenu}
                    >
                        <MenuIcon size={19} />
                    </IconButton>

                    <Stack direction="row" alignItems="baseline" spacing={1} sx={{ flexGrow: 1 }}>
                        <Typography
                            component="div"
                            sx={(tema) => ({
                                color: tema.palette.primary.main,
                                fontWeight: "bold",
                                cursor: "pointer",
                            })}
                            onClick={() => navigate("/painel")}
                        >
                            UniEduca
                        </Typography>
                        <Typography
                            sx={(tema) => ({
                                display: { xs: "none", sm: "block" },
                                color: tema.palette.grey[400],
                                fontSize: 13,
                            })}
                        >
                            Painel do site
                        </Typography>
                    </Stack>

                    <Stack flexDirection="row" alignItems="center">
                        <Tooltip title="Abrir o site em outra aba">
                            <IconButton
                                onClick={() => window.open("/", "_blank")}
                                sx={(tema) => ({ color: tema.palette.grey[400], mr: 1 })}
                            >
                                <ExternalLink size={18} />
                            </IconButton>
                        </Tooltip>

                        <Box
                            sx={(tema) => ({
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                color: tema.palette.primary.main,
                                fontWeight: "bold",
                            })}
                        >
                            <AccountCircle />
                            <Box component="span" sx={{ fontSize: 14 }}>
                                {usuario.nome ?? usuario.email}
                            </Box>
                        </Box>
                    </Stack>
                </Toolbar>
            </AppBar>

            {ehMobile ? (
                <Drawer
                    variant="temporary"
                    open={menuMobileAberto}
                    onClose={fecharMenuMobile}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        "& .MuiDrawer-paper": {
                            width: LARGURA_EXPANDIDA,
                            boxSizing: "border-box",
                            pt: `${ALTURA_CABECALHO}px`,
                            backgroundColor: "white",
                        },
                    }}
                >
                    {menu(true)}
                </Drawer>
            ) : (
                <Box
                    sx={(tema) => ({
                        borderRight: `1px solid ${tema.palette.grey[200]}`,
                        width: larguraSidebar,
                        height: "100vh",
                        backgroundColor: "white",
                        transition: "all 0.3s ease",
                        overflowX: "hidden",
                        position: "fixed",
                        paddingTop: 7,
                    })}
                >
                    {menu(menuExpandido)}
                </Box>
            )}

            <Box
                component="main"
                sx={(tema) => ({
                    minHeight: `calc(100vh - ${ALTURA_CABECALHO}px)`,
                    width: ehMobile ? "100%" : `calc(100vw - ${larguraSidebar}px)`,
                    mt: `${ALTURA_CABECALHO}px`,
                    ml: ehMobile ? 0 : `${larguraSidebar}px`,
                    p: { xs: 2, sm: 3 },
                    overflowX: "hidden",
                    transition: "all 0.3s ease",
                    backgroundColor: tema.palette.grey[50],
                })}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
