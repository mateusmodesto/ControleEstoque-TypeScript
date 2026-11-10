# Controle de Estoque

Sistema simples de controle de estoque feito com **TypeScript** e **Vite**, desenvolvido nas aulas 01, 02 e 03 de TypeScript.

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
| `src/dados.ts` | Produtos iniciais |
| `src/servicos.ts` | Regras de negócio e função genérica `transformar` |
| `src/dom.ts` | Acesso aos elementos da tela |
| `src/main.ts` | Desenha a tela e trata o formulário |

## Aula 03: API e banco de dados

Os produtos vêm de uma API (Express + MySQL) e o front os busca com `fetch`:

- `GET /api/produtos`: lista todos os produtos
- `GET /api/produtos/:id`: devolve um produto (404 se não existir)

| Arquivo | Função |
| --- | --- |
| `estoque.sql` | Cria o banco `estoque` e a tabela `produtos` com dados de exemplo |
| `api/src/servidor.ts` | Rotas da API |
| `api/src/banco.ts` | Conexão com o MySQL |
| `src/api.ts` | `listarProdutos` e `buscarProduto` (usados pelo front) |

## Como rodar

1. Rode o `estoque.sql` no MySQL Workbench.
2. Na pasta `api`, copie `.env.exemplo` para `.env` e preencha a senha do MySQL.
3. Instale e inicie (dois terminais):

```bash
npm install && npm --prefix api install
npm run api    # terminal 1: API em http://localhost:3000
npm run dev    # terminal 2: site em http://localhost:5173
```

Para conferir os tipos: `npm run verificar` (e `npm --prefix api run verificar` para a API).

## Autor

Mateus Thomasini Modesto
