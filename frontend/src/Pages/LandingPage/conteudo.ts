export const URL_INSCRICAO = "/inscricao";
export const URL_PORTAL = import.meta.env.VITE_URL_PORTAL ?? "/login";

export function irParaPortal(navegar: (url: string) => void) {
    if (/^https?:\/\//i.test(URL_PORTAL)) {
        window.location.href = URL_PORTAL;
        return;
    }

    navegar(URL_PORTAL);
}

export const COR_INSTITUCIONAL = "#14688f";
export const COR_DESTAQUE = "#05b5e6";
export const COR_TEXTO = "#1f2a37";
export const COR_TEXTO_SUAVE = "#5b6472";
export const COR_FUNDO_SUAVE = "#f5f9fc";
export const COR_BORDA = "#e2ebf1";
export const GRADIENTE_CLARO = "linear-gradient(120deg,#eaf7fd 0%,#dcf0fb 55%,#e9f6fe 100%)";
export const LARGURA_SITE = 1180;

export interface BannerHero {
    id: string;
    linhasTitulo: string[];
    chamada: string;
    apoio: string;
    claim: string[];
    textoBotao: string;
    urlBotao: string;
    imagemDesktop?: string;
    imagemMobile?: string;
    novaAba?: boolean;
}

export const BANNERS: BannerHero[] = [
    {
        id: "vestibular",
        linhasTitulo: ["Sua graduação", "começa aqui,", "em Ubá!"],
        chamada: "Inscrições abertas para 2026/2",
        apoio: "Ingresso pela nota do ENEM, sem prova e sem taxa de inscrição.",
        claim: ["Faça parte", "de uma", "instituição", "que forma", "profissionais!"],
        textoBotao: "Faça sua inscrição",
        urlBotao: URL_INSCRICAO,
        imagemDesktop: "/assets/campus-hero.svg",
    },
    {
        id: "enem",
        linhasTitulo: ["Use a sua", "nota do ENEM", "e matricule-se"],
        chamada: "Sem prova, tudo online",
        apoio: "Aproveite o desempenho que você já conquistou e garanta a sua vaga em poucos minutos.",
        claim: ["Do ENEM", "direto para", "a sala", "de aula!"],
        textoBotao: "Ingressar pelo ENEM",
        urlBotao: URL_INSCRICAO,
        imagemDesktop: "/assets/campus-hero.svg",
    },
    {
        id: "estrutura",
        linhasTitulo: ["Ensino presencial", "com apoio", "digital completo"],
        chamada: "Professores mestres e doutores",
        apoio: "Portal do aluno com notas, frequência e documentos acessíveis a qualquer momento.",
        claim: ["Estrutura", "e tecnologia", "a favor do", "seu futuro!"],
        textoBotao: "Conhecer os cursos",
        urlBotao: "#cursos",
        imagemDesktop: "/assets/campus-hero.svg",
    },
];

export const MENU_PADRAO = [
    { id: "inicio", rotulo: "Início", url: "/", ordem: 1, ativo: true, externo: false },
    { id: "sobre", rotulo: "Sobre", url: "/sobre", ordem: 2, ativo: true, externo: false },
    { id: "cursos", rotulo: "Cursos", url: "/cursos", ordem: 3, ativo: true, externo: false },
    { id: "noticias", rotulo: "Notícias", url: "/noticias", ordem: 4, ativo: true, externo: false },
    { id: "galeria", rotulo: "Galeria", url: "/galeria", ordem: 5, ativo: true, externo: false },
    { id: "contato", rotulo: "Contato", url: "/contato", ordem: 6, ativo: true, externo: false },
];

export const NUMEROS = [
    { valor: "15+", rotulo: "anos formando profissionais" },
    { valor: "12", rotulo: "cursos de graduação" },
    { valor: "94%", rotulo: "de empregabilidade" },
    { valor: "3.500", rotulo: "alunos matriculados" },
];

export const DIFERENCIAIS = [
    {
        titulo: "Corpo docente qualificado",
        texto: "Mestres e doutores com atuação no mercado, trazendo prática para a sala de aula.",
    },
    {
        titulo: "Portal do aluno completo",
        texto: "Notas, frequência, documentos e histórico acadêmico acessíveis a qualquer momento.",
    },
    {
        titulo: "Ingresso simplificado",
        texto: "Inscrição online em poucos minutos, com validação de documentos pela secretaria.",
    },
];

export interface CursoDestaque {
    nome: string;
    duracao: string;
    turno: string;
    descricao: string;
}

export const CURSOS: CursoDestaque[] = [
    {
        nome: "Análise e Desenvolvimento de Sistemas",
        duracao: "5 semestres",
        turno: "Noturno",
        descricao:
            "Formação em programação, banco de dados e engenharia de software para atuar em desenvolvimento e infraestrutura.",
    },
    {
        nome: "Administração",
        duracao: "8 semestres",
        turno: "Noturno",
        descricao:
            "Gestão de pessoas, finanças, marketing e processos para liderar equipes e empreender com segurança.",
    },
    {
        nome: "Ciências Contábeis",
        duracao: "8 semestres",
        turno: "Noturno",
        descricao:
            "Contabilidade societária, tributária e auditoria, com preparo para o exame de suficiência do CFC.",
    },
];

export interface Noticia {
    id: string;
    categoria: string;
    data: string;
    titulo: string;
    resumo: string;
    cor: string;
}

export const NOTICIAS: Noticia[] = [
    {
        id: "processo-seletivo",
        categoria: "Vestibular",
        data: "12 de setembro de 2026",
        titulo: "Inscrições abertas para o segundo semestre",
        resumo:
            "Candidatos podem se inscrever online usando a nota do ENEM. A validação dos documentos é feita pela secretaria em até dois dias úteis.",
        cor: "#05b5e6",
    },
    {
        id: "semana-academica",
        categoria: "Eventos",
        data: "28 de agosto de 2026",
        titulo: "Semana acadêmica reúne profissionais do mercado",
        resumo:
            "Palestras e oficinas com convidados das áreas de tecnologia, gestão e contabilidade, abertas a alunos e à comunidade.",
        cor: "#00a98f",
    },
    {
        id: "portal-do-aluno",
        categoria: "Institucional",
        data: "05 de agosto de 2026",
        titulo: "Portal do aluno ganha nova área de documentos",
        resumo:
            "Agora é possível acompanhar a validação de cada documento enviado na inscrição, direto pelo portal.",
        cor: "#0f6fb5",
    },
];

export const CONTATO = {
    endereco: "Ubá — Minas Gerais",
    telefone: "(32) 3000-0000",
    email: "contato@unieduca.net.br",
    horario: "Segunda a sexta, das 8h às 21h",
};
