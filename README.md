# Controle de Estoque

Sistema de controle de estoque por setor, feito com **TypeScript**: front-end com Vite, API em Node.js (Express) e banco MySQL. Desenvolvido nas aulas de TypeScript.

Repositório: https://github.com/mateusmodesto/ControleEstoque-TypeScript

## Funcionalidades

- **Login** com senha criptografada (bcrypt) e sessão por token JWT
- **Setores:** cada produto tem um setor responsável e cada usuário só enxerga o seu setor; o administrador enxerga todos
- **Produtos:** cadastrar, listar, dar entrada e saída de estoque e excluir, tudo em pop-ups
- **Histórico de movimentações** (o log): qual produto, quando e quanto, geral e por produto
- **Filtros e busca** feitos pelo banco: por situação, categoria, setor e por nome ou descrição
- Painel com totais, aviso de reposição e tema claro/escuro

## Arquitetura

```
 Navegador (TypeScript + Vite)  →  API (Express)  →  MySQL
```

A API é separada em três camadas, cada uma com uma única responsabilidade:

```
api/src/
├── servidor.ts     liga as peças (rotas, login, tratamento de erros)
├── rotas/          HTTP: lê o pedido e escolhe o código da resposta
├── servicos/       regras do negócio: validar, decidir, controlar a transação
├── dados/          só SQL
├── tipos.ts        os tipos usados pelas três camadas
├── erros.ts        ErroHttp: o erro que já carrega o código HTTP (400, 404, 409...)
└── autenticacao.ts middleware de login (token JWT)
```

A rota nunca vê SQL, e o SQL nunca vê HTTP. Os serviços lançam `ErroHttp` e um único middleware transforma o erro em resposta.

No front (`src/`): `tipos.ts` (interfaces), `api.ts` (chamadas à API), `servicos.ts` (cálculos), `dom.ts` (acesso à tela) e `main.ts` (desenha a tela e trata os eventos).

## Rotas

| Rota | O que faz |
| --- | --- |
| `GET /api/produtos` | Lista os produtos, com filtros opcionais (veja abaixo) |
| `GET /api/produtos/:id` | Devolve um produto (404 se não existir) |
| `POST /api/produtos` | Cadastra um produto (400 se os dados forem inválidos) |
| `PATCH /api/produtos/:id/quantidade` | Dá entrada ou saída no estoque |
| `DELETE /api/produtos/:id` | Remove um produto |
| `GET /api/produtos/:id/movimentacoes` | O log de um único produto |
| `GET /api/movimentacoes` | O log geral (as 50 mais recentes) |
| `GET /api/setores` | Lista os setores (público) |
| `POST /api/usuarios` | Cria uma conta (público) |
| `POST /api/login` | Devolve um token JWT (público) |
| `GET /api/eu` | Dados de quem está logado |

Produtos e movimentações exigem login: sem token válido, a resposta é 401.

### Filtros (feitos no banco)

`GET /api/produtos?situacao=baixo&categoria=limpeza&setorId=3&busca=deter`

Todos os parâmetros são opcionais e se combinam. `situacao` aceita `normal`, `baixo` e `esgotado`. A `busca` procura no nome e na descrição, sem diferenciar maiúscula nem acento. Valores inválidos recebem 400.

### Setores e permissões

| Perfil | O que enxerga e pode fazer |
| --- | --- |
| **Administrador** | Todos os produtos e movimentações. Ao cadastrar um produto, escolhe o setor. |
| **Setor** (ex.: T.I.) | Só os produtos e o histórico do próprio setor. O que cadastra fica sempre no próprio setor. |

A regra vale **na API**, não só na tela: quem pede, altera ou apaga um produto de outro setor recebe 404, como se ele não existisse. Contas criadas pela tela são sempre de setor; o administrador só existe por dentro do banco.

## Como rodar

1. Rode o `sql/estoque.sql` no MySQL Workbench.
2. Na pasta `api`, copie `.env.exemplo` para `.env`, preencha a senha do MySQL e defina o `JWT_SEGREDO` (um texto longo e aleatório; a API não inicia sem ele).
3. Instale e inicie (dois terminais):

```bash
npm install && npm --prefix api install
npm run api    # terminal 1: API em http://localhost:3000
npm run dev    # terminal 2: site em http://localhost:5173
```

4. Abra http://localhost:5173 e entre com uma conta de demonstração (senha `senha123`) ou crie uma escolhendo o setor:
   - `admin@estoque.dev`: administrador, vê todos os setores
   - `ti@estoque.dev`: setor T.I., vê só os produtos do T.I.

Para conferir os tipos: `npm run verificar` (e `npm --prefix api run verificar` para a API).

## Autor

Mateus Thomasini Modesto
