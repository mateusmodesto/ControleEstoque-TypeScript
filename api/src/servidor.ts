import "dotenv/config"; // primeira linha: carrega o .env antes de tudo
import express, { type NextFunction, type Request, type Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { banco } from "./banco";
import { CATEGORIAS, type DadosProduto, type TipoMovimentacao } from "./tipos";

const app = express();
app.use(express.json());

// Os "AS" trocam o nome da coluna do jeito do banco (estoque_minimo)
// para o jeito do TypeScript (estoqueMinimo).
const SELECT_PRODUTOS = `
SELECT id, nome, descricao, categoria, quantidade,
  estoque_minimo AS estoqueMinimo,
  preco,
  criado_em AS criadoEm
FROM produtos`;

// Busca um produto pelo id. Usada pelo GET e depois de cada INSERT.
async function buscarUm(id: number): Promise<RowDataPacket | undefined> {
  const [linhas] = await banco.execute<RowDataPacket[]>(`${SELECT_PRODUTOS} WHERE id = ?`, [id]);
  return linhas[0];
}

// Executa vários comandos como um só: ou todos acontecem, ou nenhum.
// Assim o produto e o seu log nunca ficam fora de sincronia.
async function emTransacao<T>(trabalho: (conexao: PoolConnection) => Promise<T>): Promise<T> {
  const conexao = await banco.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await trabalho(conexao);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

// Escreve uma linha no log
async function registrar(
  conexao: PoolConnection,
  produtoId: number,
  produtoNome: string,
  tipo: TipoMovimentacao,
  quantidade: number,
  saldo: number,
): Promise<void> {
  await conexao.execute(
    `INSERT INTO movimentacoes (produto_id, produto_nome, tipo, quantidade, saldo)
VALUES (?, ?, ?, ?, ?)`,
    [produtoId, produtoNome, tipo, quantidade, saldo],
  );
}

function inteiroNaoNegativo(valor: unknown): boolean {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0;
}

// Devolve a mensagem de erro, ou undefined se estiver tudo certo
function validar(dados: DadosProduto): string | undefined {
  if (typeof dados.nome !== "string" || dados.nome.trim().length < 3) {
    return "O nome precisa ter pelo menos 3 caracteres.";
  }
  if (dados.categoria === undefined || !CATEGORIAS.includes(dados.categoria)) {
    return "Categoria inválida.";
  }
  if (!inteiroNaoNegativo(dados.quantidade)) {
    return "A quantidade deve ser um número inteiro maior ou igual a zero.";
  }
  if (!inteiroNaoNegativo(dados.estoqueMinimo)) {
    return "O estoque mínimo deve ser um número inteiro maior ou igual a zero.";
  }
  if (typeof dados.preco !== "number" || !(dados.preco > 0)) {
    return "O preço deve ser maior que zero.";
  }
  return undefined;
}

// ---------- LER (Aula 3) ----------
app.get("/api/produtos", async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(`${SELECT_PRODUTOS} ORDER BY id`);
  res.json(linhas);
});

app.get("/api/produtos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const produto = Number.isInteger(id) ? await buscarUm(id) : undefined;
  if (!produto) {
    res.status(404).json({ erro: `Produto #${req.params.id} não encontrado.` });
    return;
  }
  res.json(produto);
});

// ---------- LER O LOG: as 50 movimentações mais recentes ----------
app.get("/api/movimentacoes", async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `SELECT id, produto_id AS produtoId, produto_nome AS produtoNome,
  tipo, quantidade, saldo, criado_em AS criadoEm
FROM movimentacoes
ORDER BY id DESC
LIMIT 50`,
  );
  res.json(linhas);
});

// ---------- LER O LOG DE UM PRODUTO ----------
app.get("/api/produtos/:id/movimentacoes", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).json({ erro: `Produto #${req.params.id} não encontrado.` });
    return;
  }
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `SELECT id, produto_id AS produtoId, produto_nome AS produtoNome,
  tipo, quantidade, saldo, criado_em AS criadoEm
FROM movimentacoes
WHERE produto_id = ?
ORDER BY id DESC
LIMIT 50`,
    [id],
  );
  res.json(linhas);
});

// ---------- CRIAR ----------
app.post("/api/produtos", async (req, res) => {
  const dados = req.body as DadosProduto;
  const problema = validar(dados);
  if (problema) {
    res.status(400).json({ erro: problema }); // 400: o pedido veio errado
    return;
  }
  const nome = dados.nome!.trim();
  const id = await emTransacao(async (conexao) => {
    const [resultado] = await conexao.execute<ResultSetHeader>(
      `INSERT INTO produtos (nome, descricao, categoria, quantidade, estoque_minimo, preco)
VALUES (?, ?, ?, ?, ?, ?)`,
      [nome, dados.descricao ?? null, dados.categoria!, dados.quantidade!, dados.estoqueMinimo!, dados.preco!],
    );
    await registrar(conexao, resultado.insertId, nome, "cadastro", dados.quantidade!, dados.quantidade!);
    return resultado.insertId;
  });
  // 201: criado. Devolve o produto como o banco o guardou (com id e data)
  res.status(201).json(await buscarUm(id));
});

// ---------- ATUALIZAR (só a quantidade: entrada e saída de estoque) ----------
app.patch("/api/produtos/:id/quantidade", async (req, res) => {
  const { quantidade } = req.body as { quantidade?: number };
  if (!inteiroNaoNegativo(quantidade)) {
    res.status(400).json({ erro: "A quantidade deve ser um número inteiro maior ou igual a zero." });
    return;
  }
  const id = Number(req.params.id);
  const encontrado = Number.isInteger(id)
    ? await emTransacao(async (conexao) => {
        // FOR UPDATE trava a linha: dois pedidos ao mesmo tempo não se misturam
        const [linhas] = await conexao.execute<RowDataPacket[]>(
          "SELECT nome, quantidade FROM produtos WHERE id = ? FOR UPDATE",
          [id],
        );
        if (linhas.length === 0) return false;
        const antes = linhas[0].quantidade as number;
        await conexao.execute("UPDATE produtos SET quantidade = ? WHERE id = ?", [quantidade!, id]);
        if (quantidade !== antes) {
          const tipo = quantidade! > antes ? "entrada" : "saida";
          await registrar(conexao, id, linhas[0].nome as string, tipo, Math.abs(quantidade! - antes), quantidade!);
        }
        return true;
      })
    : false;
  if (!encontrado) {
    res.status(404).json({ erro: `Produto #${req.params.id} não encontrado.` });
    return;
  }
  res.status(204).end(); // 204: deu certo, e não há nada para devolver
});

// ---------- APAGAR ----------
app.delete("/api/produtos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const encontrado = Number.isInteger(id)
    ? await emTransacao(async (conexao) => {
        const [linhas] = await conexao.execute<RowDataPacket[]>(
          "SELECT nome, quantidade FROM produtos WHERE id = ? FOR UPDATE",
          [id],
        );
        if (linhas.length === 0) return false;
        // registra ANTES de apagar: depois o produto não existe mais
        await registrar(conexao, id, linhas[0].nome as string, "exclusao", linhas[0].quantidade as number, 0);
        await conexao.execute("DELETE FROM produtos WHERE id = ?", [id]);
        return true;
      })
    : false;
  if (!encontrado) {
    res.status(404).json({ erro: `Produto #${req.params.id} não encontrado.` });
    return;
  }
  res.status(204).end();
});

// ---------- ERROS NÃO PREVISTOS: sempre depois de todas as rotas ----------
app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(erro); // o detalhe técnico fica só no terminal
  res.status(500).json({ erro: "Algo deu errado no servidor. Tente de novo." });
});

app.listen(3000, () => console.log("API do Controle de Estoque em http://localhost:3000"));
