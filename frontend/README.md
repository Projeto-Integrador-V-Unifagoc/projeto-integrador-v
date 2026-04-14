# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
# informações usadas para teste

  # -insert na tabela pessoa
    insert into 
    piv.pessoa  (id, nome, data_nascimento, logradouro, numero, bairro, cidade_id, estado, cep, cpf)
    values (gen_random_uuid(), 'Lucas Pacheco', '1979-03-12', 'Rua Maria Madalena', '23', 'Pontinho   Grelhado', '287c42ec-1fea-4559-9a0b-99edd4734d40', 'MG', '365000', '125.145.320-00')

  # -insert na tabela usuario
    insert into piv.usuario (id, email, senha, created_at, updated_at, tipo_usuario)
    values (gen_random_uuid(), 'wesleyjoas@unieduca.com', '123@123', '2024-04-05', '2024-04-05', 'professor')

  # -insert na tabela faculdade
    insert into piv.faculdade (id, nome, cidade_id, logradouro, numero, bairro, cep)
    values (gen_random_uuid(), 'Centro Universitário Ozanam Coelho', 'c6912b46-d47d-4f1f-92cc-c77df31be215', 'Rua do Morro Muito Alto', '1234', 'cachorro quente', '365000' )

  # - insert na tabela departamento
    insert into piv.departamento (id, codigo, nome, faculdade_id)
    values (gen_random_uuid(), 'DP001', 'Ciência da Computação', 'a3e9768b-bef5-4d39-9e5e-9a39b0049c8c')

  # - inset no tabela curso
    insert into piv.curso (id, codigo, nome, departamento_id )
    values (gen_random_uuid(), 'MED03', 'Medicina', '23b03286-167d-4631-9dc6-6bed9f54cf49') 