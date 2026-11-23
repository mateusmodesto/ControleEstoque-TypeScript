// CAMADA DE DADOS: usuários.
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { banco } from "../banco";
import type { Eu, UsuarioLogado } from "../tipos";

// Contas criadas pela aplicação são sempre de setor (o administrador só existe por dentro do banco).
// Se o e-mail já existir, o UNIQUE do banco lança ER_DUP_ENTRY: quem trata é o serviço.
export async function criar(nome: string, email: string, senhaHash: string, setorId: number): Promise<number> {
  const [resultado] = await banco.execute<ResultSetHeader>(
    "INSERT INTO usuarios (nome, email, senha_hash, perfil, setor_id) VALUES (?, ?, ?, 'setor', ?)",
    [nome, email, senhaHash, setorId],
  );
  return resultado.insertId;
}

export async function buscarPorEmail(
  email: string,
): Promise<{ id: number; nome: string; senhaHash: string } | undefined> {
  const [linhas] = await banco.execute<(RowDataPacket & { id: number; nome: string; senhaHash: string })[]>(
    "SELECT id, nome, senha_hash AS senhaHash FROM usuarios WHERE email = ?",
    [email],
  );
  return linhas[0];
}

// O perfil e o setor valem a cada pedido: quem consulta é o middleware de login
export async function buscarLogado(id: number): Promise<UsuarioLogado | undefined> {
  const [linhas] = await banco.execute<(UsuarioLogado & RowDataPacket)[]>(
    "SELECT id, perfil, setor_id AS setorId FROM usuarios WHERE id = ?",
    [id],
  );
  return linhas[0];
}

export async function buscarEu(id: number): Promise<Eu | undefined> {
  const [linhas] = await banco.execute<(Eu & RowDataPacket)[]>(
    `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id AS setorId, s.nome AS setorNome
FROM usuarios u
LEFT JOIN setores s ON s.id = u.setor_id
WHERE u.id = ?`,
    [id],
  );
  return linhas[0];
}
