import "dotenv/config"; // garante que o .env já foi lido antes de ler o segredo
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { buscarLogado } from "./dados/usuarios";
import type { UsuarioLogado } from "./tipos";

// O segredo assina os tokens: quem o conhece consegue fabricar um login.
// Por isso não existe valor padrão: sem o .env, a API nem sobe.
const segredo = process.env.JWT_SEGREDO;
if (!segredo) {
  throw new Error("Defina JWT_SEGREDO no arquivo api/.env (veja o .env.exemplo).");
}
export const SEGREDO: string = segredo;

// Middleware: roda antes da rota e só deixa passar quem tem token válido
export async function exigirLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const cabecalho = req.headers.authorization;
  const token = cabecalho?.startsWith("Bearer ") ? cabecalho.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ erro: "Faça login para continuar." });
    return;
  }

  let id: number;
  try {
    id = (jwt.verify(token, SEGREDO) as { id: number }).id;
  } catch {
    res.status(401).json({ erro: "Sua sessão expirou. Entre de novo." });
    return;
  }

  // O perfil e o setor vêm do BANCO a cada pedido, não do token: se o usuário
  // for removido ou mudar de setor, a mudança vale na hora.
  const usuario = await buscarLogado(id);
  if (!usuario) {
    res.status(401).json({ erro: "Sua sessão expirou. Entre de novo." });
    return;
  }
  res.locals.usuario = usuario;
  next();
}

// Quem está logado nesta requisição (as rotas leem daqui)
export function usuarioDe(res: Response): UsuarioLogado {
  return res.locals.usuario as UsuarioLogado;
}
