// CAMADA DE DADOS: o log de movimentações.
import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { banco } from "../banco";
import type { Movimentacao, NovaMovimentacao } from "../tipos";

const SELECT_MOVIMENTACOES = `
SELECT m.id, m.produto_id AS produtoId, m.produto_nome AS produtoNome,
  m.setor_id AS setorId, s.nome AS setorNome,
  m.tipo, m.quantidade, m.saldo, m.criado_em AS criadoEm
FROM movimentacoes m
JOIN setores s ON s.id = m.setor_id`;

// Escreve uma linha no log (com o setor do produto naquele momento)
export async function registrar(conexao: PoolConnection, mov: NovaMovimentacao): Promise<void> {
  await conexao.execute(
    `INSERT INTO movimentacoes (produto_id, produto_nome, setor_id, tipo, quantidade, saldo)
VALUES (?, ?, ?, ?, ?, ?)`,
    [mov.produtoId, mov.produtoNome, mov.setorId, mov.tipo, mov.quantidade, mov.saldo],
  );
}

// As 50 mais recentes, da mais nova para a mais antiga.
// Sem produtoId: o log todo do escopo. Com produtoId: só o daquele produto.
export async function listar(escopo: number | null, produtoId?: number): Promise<Movimentacao[]> {
  const condicoes: string[] = [];
  const valores: number[] = [];
  if (escopo !== null) {
    condicoes.push("m.setor_id = ?");
    valores.push(escopo);
  }
  if (produtoId !== undefined) {
    condicoes.push("m.produto_id = ?");
    valores.push(produtoId);
  }
  const onde = condicoes.length > 0 ? ` WHERE ${condicoes.join(" AND ")}` : "";
  const [linhas] = await banco.execute<(Movimentacao & RowDataPacket)[]>(
    `${SELECT_MOVIMENTACOES}${onde} ORDER BY m.id DESC LIMIT 50`,
    valores,
  );
  return linhas;
}
