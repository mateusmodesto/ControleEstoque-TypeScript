import "dotenv/config"; // primeira linha: carrega o .env antes de tudo
import express from "express";
import type { RowDataPacket } from "mysql2";
import { banco } from "./banco";

const app = express();
app.use(express.json());

// O SELECT que as duas rotas usam. Os "AS" trocam o nome da coluna
// do jeito do banco (estoque_minimo) para o jeito do TypeScript (estoqueMinimo).
const SELECT_PRODUTOS = `
SELECT id, nome, descricao, categoria, quantidade,
  estoque_minimo AS estoqueMinimo,
  preco,
  criado_em AS criadoEm
FROM produtos`;

// Todos os produtos
app.get("/api/produtos", async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(`${SELECT_PRODUTOS} ORDER BY id`);
  res.json(linhas);
});

// Um produto: pode não existir!
app.get("/api/produtos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ erro: `Id inválido: "${req.params.id}".` });
    return;
  }
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_PRODUTOS} WHERE id = ?`,
    [id], // o ? vira o número da URL
  );
  if (linhas.length === 0) {
    res.status(404).json({ erro: `Produto #${id} não encontrado.` });
    return;
  }
  res.json(linhas[0]);
});

app.listen(3000, () => console.log("API do Controle de Estoque em http://localhost:3000"));
