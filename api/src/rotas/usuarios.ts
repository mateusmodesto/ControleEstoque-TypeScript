// CAMADA DE ROTAS: cadastro, login e "quem sou eu".
// Cadastro e login são públicos: ninguém tem token antes de entrar.
import { Router } from "express";
import { exigirLogin, usuarioDe } from "../autenticacao";
import * as usuarios from "../servicos/usuarios";

export const rotasDeUsuarios = Router();

rotasDeUsuarios.post("/usuarios", async (req, res) => {
  const id = await usuarios.cadastrar(req.body ?? {});
  res.status(201).json({ id });
});

rotasDeUsuarios.post("/login", async (req, res) => {
  res.json(await usuarios.entrar(req.body ?? {}));
});

// Quem está logado: nunca devolve o senha_hash
rotasDeUsuarios.get("/eu", exigirLogin, async (_req, res) => {
  res.json(await usuarios.perfilDe(usuarioDe(res)));
});
