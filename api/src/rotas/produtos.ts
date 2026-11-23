// CAMADA DE ROTAS: só traduz HTTP. Lê o pedido, chama o serviço e escolhe o código da resposta.
// Não tem SQL nem regra de negócio; os erros (ErroHttp) sobem para o middleware do servidor.ts.
import { Router } from "express";
import { usuarioDe } from "../autenticacao";
import * as movimentacoes from "../servicos/movimentacoes";
import * as produtos from "../servicos/produtos";

export const rotasDeProdutos = Router();

// GET /api/produtos?situacao=baixo&categoria=limpeza&setorId=3&busca=deter  (todos os filtros são opcionais)
rotasDeProdutos.get("/", async (req, res) => {
  res.json(await produtos.listar(usuarioDe(res), req.query));
});

rotasDeProdutos.get("/:id", async (req, res) => {
  res.json(await produtos.obter(usuarioDe(res), req.params.id));
});

rotasDeProdutos.get("/:id/movimentacoes", async (req, res) => {
  res.json(await movimentacoes.listarDoProduto(usuarioDe(res), req.params.id));
});

rotasDeProdutos.post("/", async (req, res) => {
  const criado = await produtos.cadastrar(usuarioDe(res), req.body ?? {});
  res.status(201).json(criado); // 201: criado. Devolve o produto como o banco o guardou
});

rotasDeProdutos.patch("/:id/quantidade", async (req, res) => {
  await produtos.alterarQuantidade(usuarioDe(res), req.params.id, (req.body ?? {}).quantidade);
  res.status(204).end(); // 204: deu certo, e não há nada para devolver
});

rotasDeProdutos.delete("/:id", async (req, res) => {
  await produtos.excluir(usuarioDe(res), req.params.id);
  res.status(204).end();
});
