create table if not exists users (
    id UUID primary key default gen_random_uuid(),
    nome varchar(255) not null,
    email varchar(255) not null unique,
    senha varchar(255) not null,
    perfil varchar(255) not null check (perfil IN ('aluno', 'professor', 'secretaria')),
    criado_em timestamp default now()
);