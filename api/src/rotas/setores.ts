// CAMADA DE ROTAS: setores. É pública: a tela de criar conta precisa da lista antes do login.
import { Router } from "express";
import * as setores from "../servicos/setores";

export const rotasDeSetores = Router();

rotasDeSetores.get("/", async (_req, res) => {
  res.json(await setores.listar());
});
