# API mock de notas

Este modulo disponibiliza dados mockados de notas para integracao temporaria com os demais grupos. Os dados ficam em memoria e nao dependem de banco, migrations ou seeds.

## Endpoints

Base URL local:

```text
http://localhost:3000/notas
```

Listar todas as notas:

```http
GET /notas/mock
```

Buscar notas por aluno:

```http
GET /notas/mock/aluno/:alunoId
```

Buscar notas por turma:

```http
GET /notas/mock/turma/:turmaId
```

Buscar notas por disciplina:

```http
GET /notas/mock/disciplina/:disciplinaId
```

## Exemplo de resposta

```json
{
  "id": "nota-001",
  "alunoId": "aluno-001",
  "alunoNome": "Ana Clara Souza",
  "turmaId": "turma-ads-2026-1",
  "turmaNome": "ADS 5o Periodo",
  "disciplinaId": "disciplina-pi-v",
  "disciplinaNome": "Projeto Integrador V",
  "professorId": "prof-001",
  "professorNome": "Theilor Martins",
  "periodoLetivo": "2026/1",
  "avaliacoes": [
    {
      "id": "av-001",
      "nome": "Entrega 1",
      "nota": 8.5,
      "peso": 2
    }
  ],
  "media": 8.6,
  "situacao": "aprovado"
}
```

## Observacoes

- Esta API e temporaria e deve ser substituida pela integracao definitiva do modulo de notas.
- Os filtros usam os identificadores mockados presentes no retorno de `GET /notas/mock`.
- O campo `situacao` pode retornar `aprovado`, `recuperacao` ou `reprovado`.
