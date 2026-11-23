// CAMADA DE DADOS: setores.
import type { RowDataPacket } from "mysql2";
import { banco } from "../banco";
import type { Setor } from "../tipos";

export async function listar(): Promise<Setor[]> {
  const [linhas] = await banco.execute<(Setor & RowDataPacket)[]>("SELECT id, nome FROM setores ORDER BY nome");
  return linhas;
}

export async function existe(id: number): Promise<boolean> {
  const [linhas] = await banco.execute<RowDataPacket[]>("SELECT id FROM setores WHERE id = ?", [id]);
  return linhas.length > 0;
}
