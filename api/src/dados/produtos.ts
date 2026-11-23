// CAMADA DE DADOS: só SQL. Não conhece HTTP (req/res) nem regras de negócio.
// "escopo" é o setor a que a consulta fica restrita; null = sem restrição (administrador).
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { banco, type Executor } from "../banco";
import type { FiltrosProduto, NovoProdutoDb, Produto, ProdutoTravado, Situacao } from "../tipos";

// Os "AS" trocam o nome da coluna do jeito do banco (estoque_minimo)
// para o jeito do TypeScript (estoqueMinimo).
const SELECT_PRODUTOS = `
SELECT p.id, p.nome, p.descricao, p.categoria, p.quantidade,
  p.estoque_minimo AS estoqueMinimo,
  p.preco,
  p.setor_id AS setorId,
  s.nome AS setorNome,
  p.criado_em AS criadoEm
FROM produtos p
JOIN setores s ON s.id = p.setor_id`;

// A "situação" não é uma coluna: ela é calculada. Aqui ela vira condição de SQL
// (as mesmas regras de situacaoDoProduto no front: esgotado, baixo e normal).
const CONDICAO_DA_SITUACAO: Record<Situacao, string> = {
  esgotado: "p.quantidade = 0",
  baixo: "(p.quantidade > 0 AND p.quantidade < p.estoque_minimo)",
  normal: "(p.quantidade > 0 AND p.quantidade >= p.estoque_minimo)",
};

// Lista os produtos, com filtros opcionais feitos pelo BANCO (WHERE).
// Cada filtro ligado vira uma condição; os valores vão nos "?" (nunca dentro do texto do SQL).
export async function listar(escopo: number | null, filtros: FiltrosProduto = {}): Promise<Produto[]> {
  const condicoes: string[] = [];
  const valores: (string | number)[] = [];

  if (escopo !== null) {
    condicoes.push("p.setor_id = ?");
    valores.push(escopo);
  }
  if (filtros.setorId !== undefined) {
    condicoes.push("p.setor_id = ?");
    valores.push(filtros.setorId);
  }
  if (filtros.categoria !== undefined) {
    condicoes.push("p.categoria = ?");
    valores.push(filtros.categoria);
  }
  if (filtros.situacao !== undefined) {
    condicoes.push(CONDICAO_DA_SITUACAO[filtros.situacao]); // texto fixo nosso, escolhido por chave
  }
  if (filtros.busca !== undefined) {
    // o collation utf8mb4_unicode_ci ignora maiúsculas e acentos ("feijao" acha "Feijão").
    // % e _ digitados pela pessoa são escapados para valerem como letras comuns.
    const padrao = `%${filtros.busca.replace(/[\\%_]/g, "\\$&")}%`;
    condicoes.push("(p.nome LIKE ? OR p.descricao LIKE ?)");
    valores.push(padrao, padrao);
  }

  const onde = condicoes.length > 0 ? ` WHERE ${condicoes.join(" AND ")}` : "";
  const [linhas] = await banco.execute<(Produto & RowDataPacket)[]>(`${SELECT_PRODUTOS}${onde} ORDER BY p.id`, valores);
  return linhas;
}

export async function buscarPorId(
  id: number,
  escopo: number | null,
  executor: Executor = banco,
): Promise<Produto | undefined> {
  const [linhas] = await executor.execute<(Produto & RowDataPacket)[]>(
    `${SELECT_PRODUTOS} WHERE p.id = ?${escopo === null ? "" : " AND p.setor_id = ?"}`,
    escopo === null ? [id] : [id, escopo],
  );
  return linhas[0];
}

// FOR UPDATE trava a linha: dois pedidos ao mesmo tempo não se misturam.
// O escopo no WHERE faz o produto de outro setor parecer inexistente.
export async function travarPorId(
  conexao: PoolConnection,
  id: number,
  escopo: number | null,
): Promise<ProdutoTravado | undefined> {
  const [linhas] = await conexao.execute<(ProdutoTravado & RowDataPacket)[]>(
    `SELECT nome, quantidade, setor_id AS setorId FROM produtos
WHERE id = ?${escopo === null ? "" : " AND setor_id = ?"} FOR UPDATE`,
    escopo === null ? [id] : [id, escopo],
  );
  return linhas[0];
}

// Devolve o id que o banco gerou (AUTO_INCREMENT)
export async function inserir(conexao: PoolConnection, produto: NovoProdutoDb): Promise<number> {
  const [resultado] = await conexao.execute<ResultSetHeader>(
    `INSERT INTO produtos (nome, descricao, categoria, setor_id, quantidade, estoque_minimo, preco)
VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      produto.nome,
      produto.descricao,
      produto.categoria,
      produto.setorId,
      produto.quantidade,
      produto.estoqueMinimo,
      produto.preco,
    ],
  );
  return resultado.insertId;
}

export async function atualizarQuantidade(conexao: PoolConnection, id: number, quantidade: number): Promise<void> {
  await conexao.execute("UPDATE produtos SET quantidade = ? WHERE id = ?", [quantidade, id]);
}

export async function excluir(conexao: PoolConnection, id: number): Promise<void> {
  await conexao.execute("DELETE FROM produtos WHERE id = ?", [id]);
}
