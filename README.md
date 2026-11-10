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
| `src/dados.ts` | Produtos iniciais |
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
| `GET /api/produtos/:id/movimentacoes` | O log de um único produto |

Cada cadastro, entrada, saída e exclusão é gravado na tabela `movimentacoes` e aparece em **Histórico de movimentações**, no fim da página.

Na tela, o cadastro abre num pop-up. Cada linha da tabela tem um botão **Editar**, que abre outro pop-up com os dados do produto, onde dá para **adicionar** ou **retirar** unidades do estoque e **excluir** o produto.

| Arquivo | Função |
| --- | --- |
| `sql/estoque.sql` | Cria o banco `estoque` com as tabelas `produtos` e `movimentacoes` e dados de exemplo |
| `api/src/servidor.ts` | Rotas da API |
| `api/src/banco.ts` | Conexão com o MySQL |
| `src/api.ts` | `listarProdutos` e `buscarProduto` (usados pelo front) |

## Como rodar

1. Rode o `sql/estoque.sql` no MySQL Workbench.
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
