# Controle de Estoque

Sistema simples de controle de estoque feito com **TypeScript** e **Vite**, desenvolvido nas aulas 01 e 02 de TypeScript.

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

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Para conferir os tipos: `npm run verificar`.

## Autor

Mateus Thomasini Modesto
