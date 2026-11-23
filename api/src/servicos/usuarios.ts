// CAMADA DE SERVIÇOS: cadastro, login e perfil de usuários.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SEGREDO } from "../autenticacao";
import * as setoresDados from "../dados/setores";
import * as usuariosDados from "../dados/usuarios";
import { ErroHttp } from "../erros";
import type { Eu, UsuarioLogado } from "../tipos";

interface DadosDeCadastro {
  nome?: unknown;
  email?: unknown;
  senha?: unknown;
  setorId?: unknown;
}

// Devolve o id da conta criada. Contas criadas aqui são sempre de setor.
export async function cadastrar(dados: DadosDeCadastro): Promise<number> {
  const { nome, email, senha, setorId } = dados;
  if (
    typeof nome !== "string" ||
    nome.trim() === "" ||
    typeof email !== "string" ||
    !email.includes("@") ||
    typeof senha !== "string" ||
    senha.length < 6
  ) {
    throw new ErroHttp(400, "Preencha nome, e-mail válido e senha de 6 caracteres ou mais.");
  }
  if (typeof setorId !== "number" || !(await setoresDados.existe(setorId))) {
    throw new ErroHttp(400, "Escolha o seu setor.");
  }

  const hash = await bcrypt.hash(senha, 10); // nunca se guarda a senha, só o hash
  try {
    return await usuariosDados.criar(nome.trim(), email.trim().toLowerCase(), hash, setorId);
  } catch (erro) {
    // quem descobre o e-mail repetido é o UNIQUE do banco
    if ((erro as { code?: string }).code === "ER_DUP_ENTRY") {
      throw new ErroHttp(409, "Este e-mail já está cadastrado.");
    }
    throw erro;
  }
}

export async function entrar(dados: { email?: unknown; senha?: unknown }): Promise<{ token: string; nome: string }> {
  const email = typeof dados.email === "string" ? dados.email.trim().toLowerCase() : "";
  const usuario = await usuariosDados.buscarPorEmail(email);
  const senhaConfere =
    usuario !== undefined && typeof dados.senha === "string" && (await bcrypt.compare(dados.senha, usuario.senhaHash));
  if (!usuario || !senhaConfere) {
    // a mesma mensagem nos dois casos: não contamos qual dos dois errou
    throw new ErroHttp(401, "E-mail ou senha inválidos.");
  }
  const token = jwt.sign({ id: usuario.id }, SEGREDO, { expiresIn: "8h" });
  return { token, nome: usuario.nome };
}

export async function perfilDe(usuario: UsuarioLogado): Promise<Eu> {
  const eu = await usuariosDados.buscarEu(usuario.id);
  if (!eu) throw new ErroHttp(404, "Usuário não encontrado.");
  return eu;
}
