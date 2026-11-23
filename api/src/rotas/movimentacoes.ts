// CAMADA DE ROTAS: o log de movimentações.
import { Router } from "express";
import { usuarioDe } from "../autenticacao";
import * as movimentacoes from "../servicos/movimentacoes";

export const rotasDeMovimentacoes = Router();

// As 50 mais recentes do setor de quem está logado (o administrador vê todas)
rotasDeMovimentacoes.get("/", async (_req, res) => {
  res.json(await movimentacoes.listar(usuarioDe(res)));
});
