import { useMemo, useState, type ReactNode } from "react";
import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Chip, IconButton, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import {
    ChevronDown,
    ChevronRight,
    Copy,
    Eye,
    EyeOff,
    FilePlus,
    FileText,
    Folder,
    FolderInput,
    GripVertical,
    MoreVertical,
    Pencil,
    Send,
    Trash2,
    Undo2,
} from "lucide-react";
import type { LimitesConteudo, PaginaResumo, TopicoConteudo } from "../../../models/conteudo-model";

export type EstruturaArvore = { id: string; paginas: string[] }[];

export interface AcoesArvore {
    onSelecionarPagina: (pagina: PaginaResumo) => void;
    onNovaPagina: (topico: TopicoConteudo) => void;
    onRenomearTopico: (topico: TopicoConteudo) => void;
    onPublicarTopico: (topico: TopicoConteudo) => void;
    onDuplicarTopico: (topico: TopicoConteudo) => void;
    onExcluirTopico: (topico: TopicoConteudo) => void;
    onRenomearPagina: (pagina: PaginaResumo) => void;
    onAlternarOculta: (pagina: PaginaResumo) => void;
    onDuplicarPagina: (pagina: PaginaResumo) => void;
    onMoverPagina: (pagina: PaginaResumo) => void;
    onExcluirPagina: (pagina: PaginaResumo) => void;
    onReordenar: (estrutura: EstruturaArvore) => void;
}

interface Props extends AcoesArvore {
    topicos: TopicoConteudo[];
    limites: LimitesConteudo;
    paginaSelecionadaId: string | null;
}

const idTopico = (id: string) => `t:${id}`;
const idPagina = (id: string) => `p:${id}`;
const original = (id: string) => id.slice(2);

function estruturaDe(topicos: TopicoConteudo[]): EstruturaArvore {
    return topicos.map((t) => ({ id: t.id, paginas: t.paginas.map((p) => p.id) }));
}

function MenuAcoes({ itens }: { itens: { rotulo: string; icone: ReactNode; onClick: () => void; perigo?: boolean }[] }) {
    const [ancora, setAncora] = useState<HTMLElement | null>(null);
    return (
        <>
            <IconButton
                size="small"
                aria-label="Mais ações"
                onClick={(e) => {
                    e.stopPropagation();
                    setAncora(e.currentTarget);
                }}
            >
                <MoreVertical size={16} />
            </IconButton>
            <Menu anchorEl={ancora} open={Boolean(ancora)} onClose={() => setAncora(null)} onClick={(e) => e.stopPropagation()}>
                {itens.map((item) => (
                    <MenuItem
                        key={item.rotulo}
                        onClick={() => {
                            setAncora(null);
                            item.onClick();
                        }}
                        sx={item.perigo ? { color: "error.main" } : undefined}
                    >
                        <ListItemIcon sx={item.perigo ? { color: "error.main" } : undefined}>{item.icone}</ListItemIcon>
                        {item.rotulo}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}

function Alca(props: Record<string, unknown>) {
    return (
        <Box
            {...props}
            className="alca-arrastar"
            sx={{ cursor: "grab", color: "grey.300", display: "flex", opacity: 0, transition: "opacity .1s", touchAction: "none" }}
            aria-label="Arrastar"
        >
            <GripVertical size={16} />
        </Box>
    );
}

function LinhaPagina({ pagina, numero, selecionada, acoes }: { pagina: PaginaResumo; numero: number; selecionada: boolean; acoes: AcoesArvore }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: idPagina(pagina.id) });
    return (
        <Stack
            ref={setNodeRef}
            direction="row"
            alignItems="center"
            gap={0.5}
            onClick={() => acoes.onSelecionarPagina(pagina)}
            sx={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                pl: 3.5,
                pr: 0.5,
                py: 0.5,
                borderRadius: 1,
                cursor: "pointer",
                borderLeft: "3px solid",
                borderColor: selecionada ? "primary.main" : "transparent",
                bgcolor: selecionada ? "rgba(5,181,230,.12)" : "transparent",
                "&:hover": { bgcolor: selecionada ? "rgba(5,181,230,.16)" : "grey.100" },
                "&:hover .alca-arrastar": { opacity: 1 },
            }}
        >
            <Alca {...attributes} {...listeners} />
            <Box sx={{ color: pagina.oculta ? "grey.300" : "grey.400", display: "flex" }}>
                {pagina.oculta ? <EyeOff size={15} /> : <FileText size={15} />}
            </Box>
            <Typography
                variant="body2"
                noWrap
                sx={{
                    flex: 1,
                    color: pagina.oculta ? "text.disabled" : "text.primary",
                    fontStyle: pagina.titulo ? "normal" : "italic",
                    fontWeight: selecionada ? 700 : 400,
                }}
                title={pagina.oculta ? "Oculta para os alunos" : undefined}
            >
                {numero}. {pagina.titulo || "Página sem título"}
            </Typography>
            <MenuAcoes
                itens={[
                    { rotulo: "Renomear", icone: <Pencil size={16} />, onClick: () => acoes.onRenomearPagina(pagina) },
                    {
                        rotulo: pagina.oculta ? "Mostrar ao aluno" : "Ocultar do aluno",
                        icone: pagina.oculta ? <Eye size={16} /> : <EyeOff size={16} />,
                        onClick: () => acoes.onAlternarOculta(pagina),
                    },
                    { rotulo: "Duplicar", icone: <Copy size={16} />, onClick: () => acoes.onDuplicarPagina(pagina) },
                    { rotulo: "Mover para outro tópico", icone: <FolderInput size={16} />, onClick: () => acoes.onMoverPagina(pagina) },
                    { rotulo: "Excluir", icone: <Trash2 size={16} />, onClick: () => acoes.onExcluirPagina(pagina), perigo: true },
                ]}
            />
        </Stack>
    );
}

function BlocoTopico({
    topico,
    paginas,
    limites,
    expandido,
    onAlternar,
    paginaSelecionadaId,
    acoes,
}: {
    topico: TopicoConteudo;
    paginas: PaginaResumo[];
    limites: LimitesConteudo;
    expandido: boolean;
    onAlternar: () => void;
    paginaSelecionadaId: string | null;
    acoes: AcoesArvore;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: idTopico(topico.id) });
    const { recomendado, maximo } = limites.paginasPorTopico;
    const total = paginas.length;
    const corContador = total >= maximo ? "error" : total > recomendado ? "warning" : "default";
    return (
        <Box ref={setNodeRef} sx={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
            <Tooltip
                placement="right"
                title={topico.atualizadoPorNome ? `Última edição por ${topico.atualizadoPorNome}` : ""}
                disableHoverListener={!topico.atualizadoPorNome}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    gap={0.5}
                    onClick={onAlternar}
                    sx={{
                        py: 0.75,
                        pr: 0.5,
                        borderRadius: 1,
                        cursor: "pointer",
                        "&:hover": { bgcolor: "grey.100" },
                        "&:hover .alca-arrastar": { opacity: 1 },
                    }}
                >
                    <Alca {...attributes} {...listeners} />
                    <Box sx={{ display: "flex", color: "grey.400" }}>{expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</Box>
                    <Box sx={{ display: "flex", color: "primary.main" }}><Folder size={16} /></Box>
                    <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>{topico.titulo}</Typography>
                    <Chip
                        size="small"
                        label={topico.publicado ? "Publicado" : "Rascunho"}
                        color={topico.publicado ? "success" : "default"}
                        variant={topico.publicado ? "filled" : "outlined"}
                        sx={{ height: 20, fontSize: 11 }}
                    />
                    <Chip size="small" label={`${total}/${recomendado}`} color={corContador} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                    <MenuAcoes
                        itens={[
                            { rotulo: "Renomear", icone: <Pencil size={16} />, onClick: () => acoes.onRenomearTopico(topico) },
                            { rotulo: "Adicionar página", icone: <FilePlus size={16} />, onClick: () => acoes.onNovaPagina(topico) },
                            {
                                rotulo: topico.publicado ? "Despublicar tópico" : "Publicar tópico",
                                icone: topico.publicado ? <Undo2 size={16} /> : <Send size={16} />,
                                onClick: () => acoes.onPublicarTopico(topico),
                            },
                            { rotulo: "Duplicar", icone: <Copy size={16} />, onClick: () => acoes.onDuplicarTopico(topico) },
                            { rotulo: "Excluir", icone: <Trash2 size={16} />, onClick: () => acoes.onExcluirTopico(topico), perigo: true },
                        ]}
                    />
                </Stack>
            </Tooltip>
            {expandido && (
                <SortableContext items={paginas.map((p) => idPagina(p.id))} strategy={verticalListSortingStrategy}>
                    <Stack gap={0.25}>
                        {paginas.map((pagina, indice) => (
                            <LinhaPagina
                                key={pagina.id}
                                pagina={pagina}
                                numero={indice + 1}
                                selecionada={pagina.id === paginaSelecionadaId}
                                acoes={acoes}
                            />
                        ))}
                        <Typography
                            variant="body2"
                            onClick={() => (total < maximo ? acoes.onNovaPagina(topico) : undefined)}
                            sx={{
                                pl: 5,
                                py: 0.5,
                                color: total < maximo ? "primary.main" : "text.disabled",
                                cursor: total < maximo ? "pointer" : "not-allowed",
                                fontWeight: 600,
                            }}
                        >
                            {total < maximo ? "+ Nova página" : `Máximo de ${maximo} páginas atingido`}
                        </Typography>
                    </Stack>
                </SortableContext>
            )}
        </Box>
    );
}

export default function ArvoreConteudo({ topicos, limites, paginaSelecionadaId, ...acoes }: Props) {
    const [estrutura, setEstrutura] = useState<EstruturaArvore>(() => estruturaDe(topicos));
    const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set(topicos.map((t) => t.id)));
    const [arrastando, setArrastando] = useState<string | null>(null);

    // A árvore vinda do servidor manda; o estado local só vive durante o arraste.
    // Ajuste durante o render quando a prop muda (padrão recomendado pelo React).
    const [topicosBase, setTopicosBase] = useState(topicos);
    if (topicosBase !== topicos) {
        setTopicosBase(topicos);
        setEstrutura(estruturaDe(topicos));
        const novos = topicos.filter((t) => !topicosBase.some((b) => b.id === t.id)).map((t) => t.id);
        if (novos.length) setExpandidos((atual) => new Set([...atual, ...novos]));
    }

    const porId = useMemo(() => {
        const topicosPorId = new Map(topicos.map((t) => [t.id, t]));
        const paginasPorId = new Map(topicos.flatMap((t) => t.paginas).map((p) => [p.id, p]));
        return { topicosPorId, paginasPorId };
    }, [topicos]);

    const sensores = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const topicoDaPagina = (lista: EstruturaArvore, paginaId: string) => lista.findIndex((t) => t.paginas.includes(paginaId));

    const aoComecar = (e: DragStartEvent) => setArrastando(String(e.active.id));

    // Página arrastada sobre outro tópico (ou sobre uma página dele) muda de tópico já durante o arraste.
    const aoPassar = (e: DragOverEvent) => {
        const ativo = String(e.active.id);
        const sobre = e.over ? String(e.over.id) : null;
        if (!sobre || !ativo.startsWith("p:")) return;
        setEstrutura((atual) => {
            const pagina = original(ativo);
            const origem = topicoDaPagina(atual, pagina);
            const destino = sobre.startsWith("t:")
                ? atual.findIndex((t) => t.id === original(sobre))
                : topicoDaPagina(atual, original(sobre));
            if (origem < 0 || destino < 0 || origem === destino) return atual;
            const copia = atual.map((t) => ({ ...t, paginas: [...t.paginas] }));
            copia[origem].paginas = copia[origem].paginas.filter((id) => id !== pagina);
            const indice = sobre.startsWith("p:") ? copia[destino].paginas.indexOf(original(sobre)) : copia[destino].paginas.length;
            copia[destino].paginas.splice(indice < 0 ? copia[destino].paginas.length : indice, 0, pagina);
            return copia;
        });
        if (sobre.startsWith("t:")) setExpandidos((atual) => new Set(atual).add(original(sobre)));
    };

    const aoSoltar = (e: DragEndEvent) => {
        setArrastando(null);
        const ativo = String(e.active.id);
        const sobre = e.over ? String(e.over.id) : null;
        let proxima = estrutura;
        if (sobre && ativo !== sobre) {
            if (ativo.startsWith("t:")) {
                const de = estrutura.findIndex((t) => t.id === original(ativo));
                const alvo = sobre.startsWith("t:") ? original(sobre) : estrutura[topicoDaPagina(estrutura, original(sobre))]?.id;
                const para = estrutura.findIndex((t) => t.id === alvo);
                if (de >= 0 && para >= 0) proxima = arrayMove(estrutura, de, para);
            } else if (sobre.startsWith("p:")) {
                const t = topicoDaPagina(estrutura, original(ativo));
                if (t >= 0 && t === topicoDaPagina(estrutura, original(sobre))) {
                    const paginas = estrutura[t].paginas;
                    proxima = estrutura.map((item, i) =>
                        i === t
                            ? { ...item, paginas: arrayMove(paginas, paginas.indexOf(original(ativo)), paginas.indexOf(original(sobre))) }
                            : item,
                    );
                }
            }
        }
        setEstrutura(proxima);
        if (JSON.stringify(proxima) !== JSON.stringify(estruturaDe(topicos))) acoes.onReordenar(proxima);
    };

    const rotuloArrastado = (() => {
        if (!arrastando) return null;
        if (arrastando.startsWith("t:")) return porId.topicosPorId.get(original(arrastando))?.titulo ?? "";
        return porId.paginasPorId.get(original(arrastando))?.titulo || "Página sem título";
    })();

    return (
        <DndContext
            sensors={sensores}
            collisionDetection={closestCenter}
            onDragStart={aoComecar}
            onDragOver={aoPassar}
            onDragEnd={aoSoltar}
            onDragCancel={() => {
                setArrastando(null);
                setEstrutura(estruturaDe(topicos));
            }}
        >
            <SortableContext items={estrutura.map((t) => idTopico(t.id))} strategy={verticalListSortingStrategy}>
                <Stack gap={0.5}>
                    {estrutura.map((item) => {
                        const topico = porId.topicosPorId.get(item.id);
                        if (!topico) return null;
                        const paginas = item.paginas.map((id) => porId.paginasPorId.get(id)).filter(Boolean) as PaginaResumo[];
                        return (
                            <BlocoTopico
                                key={item.id}
                                topico={topico}
                                paginas={paginas}
                                limites={limites}
                                expandido={expandidos.has(item.id)}
                                onAlternar={() =>
                                    setExpandidos((atual) => {
                                        const novo = new Set(atual);
                                        if (novo.has(item.id)) novo.delete(item.id);
                                        else novo.add(item.id);
                                        return novo;
                                    })
                                }
                                paginaSelecionadaId={paginaSelecionadaId}
                                acoes={acoes}
                            />
                        );
                    })}
                </Stack>
            </SortableContext>
            <DragOverlay>
                {rotuloArrastado !== null && (
                    <Stack
                        direction="row"
                        gap={1}
                        alignItems="center"
                        sx={{ px: 1.5, py: 0.75, bgcolor: "background.default", borderRadius: 1, boxShadow: 6, transform: "rotate(-2deg)" }}
                    >
                        {arrastando?.startsWith("t:") ? <Folder size={16} /> : <FileText size={16} />}
                        <Typography variant="body2" fontWeight={600}>{rotuloArrastado}</Typography>
                    </Stack>
                )}
            </DragOverlay>
        </DndContext>
    );
}
