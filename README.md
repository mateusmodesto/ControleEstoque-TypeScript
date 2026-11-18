# Controle de Estoque

Sistema simples de controle de estoque feito com **TypeScript** e **Vite**, desenvolvido nas aulas 01 a 04 de TypeScript.

Repositório: https://github.com/mateusmodesto/ControleEstoque-TypeScript

## Funcionalidades

- Cadastro de produtos (nome, categoria, quantidade, estoque mínimo e preço) com validação
- Tabela de produtos com situação: normal, estoque baixo ou esgotado
- Painel com total de produtos, itens em estoque, estoque baixo e valor total
- Aviso do primeiro produto que precisa de reposição

## Estrutura

| Arquivo | Função |
| --- | --- |
| `src/tipos.ts` | Tipos e interfaces (`Produto`, `NovoProduto`, ...) |
| `src/servicos.ts` | `situacaoDoProduto`, `valorTotal` e a função genérica `transformar` |
| `src/dom.ts` | Acesso aos elementos da tela |
| `src/main.ts` | Desenha a tela e trata o formulário |

## Aulas 03 e 04: API e banco de dados

Os produtos vêm de uma API (Express + MySQL) e o front se comunica com ela por `fetch`:

| Rota | O que faz |
| --- | --- |
| `GET /api/produtos` | Lista todos os produtos |
| `GET /api/produtos/:id` | Devolve um produto (404 se não existir) |
| `POST /api/produtos` | Cadastra um produto (400 se os dados forem inválidos) |
| `PATCH /api/produtos/:id/quantidade` | Dá entrada ou saída no estoque |
| `DELETE /api/produtos/:id` | Remove um produto |
| `GET /api/movimentacoes` | Histórico (log): qual produto, quando e quanto |
| `POST /api/usuarios` | Cria uma conta (público) |
| `POST /api/login` | Confere e-mail e senha e devolve um token JWT (público) |
| `GET /api/eu` | Dados de quem está logado (nome, perfil e setor) |
| `GET /api/setores` | Lista os setores (público: a tela de criar conta usa) |

Todas as rotas de produtos e movimentações exigem login: sem token válido a resposta é 401.

### Setores e permissões

Cada produto pertence a um **setor responsável** (T.I., Administrativo, Serviços Gerais, Cozinha) e cada usuário pertence a um setor.

| Perfil | O que enxerga e pode fazer |
| --- | --- |
| **Administrador** | Todos os produtos e movimentações, de todos os setores. Ao cadastrar um produto, escolhe o setor. |
| **Setor** (ex.: T.I.) | Só os produtos e o histórico do próprio setor. Os produtos que cadastra ficam sempre no próprio setor. |

A regra é aplicada **na API**, não só na tela: um usuário de setor que peça, altere ou apague um produto de outro setor recebe 404, como se ele não existisse. Contas criadas pela tela são sempre de setor; o administrador só existe por dentro do banco.
| `GET /api/produtos/:id/movimentacoes` | O log de um único produto |

Cada cadastro, entrada, saída e exclusão é gravado na tabela `movimentacoes` e aparece em **Histórico de movimentações**, no fim da página.

Na tela, o cadastro abre num pop-up. Cada linha da tabela tem um botão **Editar**, que abre outro pop-up com os dados do produto, onde dá para **adicionar** ou **retirar** unidades do estoque e **excluir** o produto.

### Filtros e busca (Aula 6)

Acima da tabela de produtos há filtros por **situação** (normal, estoque baixo, esgotado, com a contagem em cada botão), por **categoria** e, para o administrador, por **setor**, além de uma **busca** por nome ou descrição que ignora acento e maiúscula. Os filtros se combinam e há um botão **Limpar filtros**. Só a tabela é filtrada: os cartões do topo e o aviso de reposição sempre mostram o estoque inteiro.

| Arquivo | Função |
| --- | --- |
| `sql/estoque.sql` | Cria o banco `estoque` com as tabelas `setores`, `usuarios`, `produtos` e `movimentacoes` e dados de exemplo |
| `api/src/servidor.ts` | Rotas da API |
| `api/src/banco.ts` | Conexão com o MySQL |
| `src/api.ts` | `listarProdutos` e `buscarProduto` (usados pelo front) |

## Como rodar

1. Rode o `sql/estoque.sql` no MySQL Workbench.
2. Na pasta `api`, copie `.env.exemplo` para `.env`, preencha a senha do MySQL e defina o `JWT_SEGREDO` (um texto longo e aleatório; a API não inicia sem ele).
3. Instale e inicie (dois terminais):

```bash
npm install && npm --prefix api install
npm run api    # terminal 1: API em http://localhost:3000
npm run dev    # terminal 2: site em http://localhost:5173
```

4. Abra http://localhost:5173 e entre com uma das contas de demonstração (senha `senha123`) ou crie uma conta escolhendo o setor:
   - `admin@estoque.dev`: administrador, vê todos os setores
   - `ti@estoque.dev`: usuário do setor T.I., vê só os produtos do T.I.

Para conferir os tipos: `npm run verificar` (e `npm --prefix api run verificar` para a API).

## Autor

Mateus Thomasini Modesto
