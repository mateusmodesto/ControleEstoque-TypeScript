import "dotenv/config"; // primeira linha: carrega o .env antes de tudo
import bcrypt from "bcryptjs";
import express, { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { exigirLogin, SEGREDO, usuarioDe } from "./autenticacao";
import { banco } from "./banco";
import { CATEGORIAS, type DadosProduto, type TipoMovimentacao } from "./tipos";

const app = express();
app.use(express.json());

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

const SELECT_MOVIMENTACOES = `
SELECT m.id, m.produto_id AS produtoId, m.produto_nome AS produtoNome,
  m.setor_id AS setorId, s.nome AS setorNome,
  m.tipo, m.quantidade, m.saldo, m.criado_em AS criadoEm
FROM movimentacoes m
JOIN setores s ON s.id = m.setor_id`;

// ---------- ISOLAMENTO POR SETOR ----------
// O administrador enxerga tudo; os demais, só o setor deles.
// Devolve um pedaço de SQL para somar ao WHERE e o valor do "?".
// "coluna" vem sempre do nosso código, nunca do navegador.
function escopoDoSetor(res: Response, coluna: string): { sql: string; valores: number[] } {
  const usuario = usuarioDe(res);
  if (usuario.perfil === "administrador") {
    return { sql: "", valores: [] };
  }
  return { sql: ` AND ${coluna} = ?`, valores: [usuario.setorId!] };
}

// Busca um produto pelo id, já respeitando o setor de quem pergunta.
// Produto de outro setor se comporta como se não existisse.
async function buscarUm(id: number, res: Response): Promise<RowDataPacket | undefined> {
  const escopo = escopoDoSetor(res, "p.setor_id");
  const [linhas] = await banco.execute<RowDataPacket[]>(`${SELECT_PRODUTOS} WHERE p.id = ?${escopo.sql}`, [
    id,
    ...escopo.valores,
  ]);
  return linhas[0];
}

async function setorExiste(id: unknown): Promise<boolean> {
  if (typeof id !== "number" || !Number.isInteger(id)) return false;
  const [linhas] = await banco.execute<RowDataPacket[]>("SELECT id FROM setores WHERE id = ?", [id]);
  return linhas.length > 0;
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

// Escreve uma linha no log (com o setor do produto naquele momento)
async function registrar(
  conexao: PoolConnection,
  produtoId: number,
  produtoNome: string,
  setorId: number,
  tipo: TipoMovimentacao,
  quantidade: number,
  saldo: number,
): Promise<void> {
  await conexao.execute(
    `INSERT INTO movimentacoes (produto_id, produto_nome, setor_id, tipo, quantidade, saldo)
VALUES (?, ?, ?, ?, ?, ?)`,
    [produtoId, produtoNome, setorId, tipo, quantidade, saldo],
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

// ---------- SETORES (público: a tela de criar conta precisa da lista) ----------
app.get("/api/setores", async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>("SELECT id, nome FROM setores ORDER BY nome");
  res.json(linhas);
});

// ---------- USUÁRIOS E LOGIN (Aula 5) ----------
// Estas rotas são públicas: ninguém tem token antes de entrar.
app.post("/api/usuarios", async (req, res) => {
  const { nome, email, senha, setorId } = (req.body ?? {}) as {
    nome?: string;
    email?: string;
    senha?: string;
    setorId?: number;
  };
  if (!nome?.trim() || !email?.includes("@") || !senha || senha.length < 6) {
    res.status(400).json({ erro: "Preencha nome, e-mail válido e senha de 6 caracteres ou mais." });
    return;
  }
  if (!(await setorExiste(setorId))) {
    res.status(400).json({ erro: "Escolha o seu setor." });
    return;
  }
  const hash = await bcrypt.hash(senha, 10); // nunca se guarda a senha, só o hash
  try {
    // contas criadas aqui são SEMPRE de setor: administrador só existe por dentro do banco
    const [resultado] = await banco.execute<ResultSetHeader>(
      "INSERT INTO usuarios (nome, email, senha_hash, perfil, setor_id) VALUES (?, ?, ?, 'setor', ?)",
      [nome.trim(), email.trim().toLowerCase(), hash, setorId!],
    );
    res.status(201).json({ id: resultado.insertId });
  } catch (erro) {
    // quem descobre o e-mail repetido é o UNIQUE do banco
    if ((erro as { code?: string }).code === "ER_DUP_ENTRY") {
      res.status(409).json({ erro: "Este e-mail já está cadastrado." });
      return;
    }
    throw erro;
  }
});

app.post("/api/login", async (req, res) => {
  const { email, senha } = (req.body ?? {}) as { email?: string; senha?: string };
  const [linhas] = await banco.execute<RowDataPacket[]>(
    "SELECT id, nome, senha_hash FROM usuarios WHERE email = ?",
    [email?.trim().toLowerCase() ?? ""],
  );
  const usuario = linhas[0];
  if (!usuario || !senha || !(await bcrypt.compare(senha, usuario.senha_hash))) {
    // a mesma mensagem nos dois casos: não contamos qual dos dois errou
    res.status(401).json({ erro: "E-mail ou senha inválidos." });
    return;
  }
  const token = jwt.sign({ id: usuario.id }, SEGREDO, { expiresIn: "8h" });
  res.json({ token, nome: usuario.nome });
});

// Quem está logado: nunca devolve o senha_hash
app.get("/api/eu", exigirLogin, async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id AS setorId, s.nome AS setorNome
FROM usuarios u
LEFT JOIN setores s ON s.id = u.setor_id
WHERE u.id = ?`,
    [usuarioDe(res).id],
  );
  if (linhas.length === 0) {
    res.status(404).json({ erro: "Usuário não encontrado." });
    return;
  }
  res.json(linhas[0]);
});

// Daqui para baixo, tudo exige login: sem token válido, a resposta é 401
app.use("/api/produtos", exigirLogin);
app.use("/api/movimentacoes", exigirLogin);

// ---------- LER ----------
app.get("/api/produtos", async (_req, res) => {
  const escopo = escopoDoSetor(res, "p.setor_id");
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_PRODUTOS} WHERE 1 = 1${escopo.sql} ORDER BY p.id`,
    escopo.valores,
  );
  res.json(linhas);
});

app.get("/api/produtos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const produto = Number.isInteger(id) ? await buscarUm(id, res) : undefined;
  if (!produto) {
    res.status(404).json({ erro: `Produto #${req.params.id} não encontrado.` });
    return;
  }
  res.json(produto);
});

// ---------- LER O LOG: as 50 movimentações mais recentes do setor ----------
app.get("/api/movimentacoes", async (_req, res) => {
  const escopo = escopoDoSetor(res, "m.setor_id");
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_MOVIMENTACOES} WHERE 1 = 1${escopo.sql} ORDER BY m.id DESC LIMIT 50`,
    escopo.valores,
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
  const escopo = escopoDoSetor(res, "m.setor_id");
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_MOVIMENTACOES} WHERE m.produto_id = ?${escopo.sql} ORDER BY m.id DESC LIMIT 50`,
    [id, ...escopo.valores],
  );
  res.json(linhas);
});

// ---------- CRIAR ----------
app.post("/api/produtos", async (req, res) => {
  const dados = (req.body ?? {}) as DadosProduto;
  const problema = validar(dados);
  if (problema) {
    res.status(400).json({ erro: problema }); // 400: o pedido veio errado
    return;
  }

  // Quem decide o setor: o administrador escolhe; os demais SEMPRE usam o próprio
  // setor, mesmo que o navegador mande outro número.
  const usuario = usuarioDe(res);
  let setorId: number;
  if (usuario.perfil === "administrador") {
    if (!(await setorExiste(dados.setorId))) {
      res.status(400).json({ erro: "Escolha o setor responsável pelo produto." });
      return;
    }
    setorId = dados.setorId!;
  } else {
    setorId = usuario.setorId!;
  }

  const nome = dados.nome!.trim();
  const id = await emTransacao(async (conexao) => {
    const [resultado] = await conexao.execute<ResultSetHeader>(
      `INSERT INTO produtos (nome, descricao, categoria, setor_id, quantidade, estoque_minimo, preco)
VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nome, dados.descricao ?? null, dados.categoria!, setorId, dados.quantidade!, dados.estoqueMinimo!, dados.preco!],
    );
    await registrar(conexao, resultado.insertId, nome, setorId, "cadastro", dados.quantidade!, dados.quantidade!);
    return resultado.insertId;
  });
  // 201: criado. Devolve o produto como o banco o guardou (com id, setor e data)
  res.status(201).json(await buscarUm(id, res));
});

// ---------- ATUALIZAR (só a quantidade: entrada e saída de estoque) ----------
app.patch("/api/produtos/:id/quantidade", async (req, res) => {
  const { quantidade } = (req.body ?? {}) as { quantidade?: number };
  if (!inteiroNaoNegativo(quantidade)) {
    res.status(400).json({ erro: "A quantidade deve ser um número inteiro maior ou igual a zero." });
    return;
  }
  const id = Number(req.params.id);
  const escopo = escopoDoSetor(res, "setor_id");
  const encontrado = Number.isInteger(id)
    ? await emTransacao(async (conexao) => {
        // FOR UPDATE trava a linha: dois pedidos ao mesmo tempo não se misturam.
        // O escopo no WHERE faz o produto de outro setor parecer inexistente.
        const [linhas] = await conexao.execute<RowDataPacket[]>(
          `SELECT nome, quantidade, setor_id AS setorId FROM produtos WHERE id = ?${escopo.sql} FOR UPDATE`,
          [id, ...escopo.valores],
        );
        if (linhas.length === 0) return false;
        const antes = linhas[0].quantidade as number;
        await conexao.execute("UPDATE produtos SET quantidade = ? WHERE id = ?", [quantidade!, id]);
        if (quantidade !== antes) {
          const tipo = quantidade! > antes ? "entrada" : "saida";
          await registrar(
            conexao,
            id,
            linhas[0].nome as string,
            linhas[0].setorId as number,
            tipo,
            Math.abs(quantidade! - antes),
            quantidade!,
          );
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
  const escopo = escopoDoSetor(res, "setor_id");
  const encontrado = Number.isInteger(id)
    ? await emTransacao(async (conexao) => {
        const [linhas] = await conexao.execute<RowDataPacket[]>(
          `SELECT nome, quantidade, setor_id AS setorId FROM produtos WHERE id = ?${escopo.sql} FOR UPDATE`,
          [id, ...escopo.valores],
        );
        if (linhas.length === 0) return false;
        // registra ANTES de apagar: depois o produto não existe mais
        await registrar(
          conexao,
          id,
          linhas[0].nome as string,
          linhas[0].setorId as number,
          "exclusao",
          linhas[0].quantidade as number,
          0,
        );
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
