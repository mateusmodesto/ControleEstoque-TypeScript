import "dotenv/config";
import mysql, { type Pool, type PoolConnection } from "mysql2/promise";

// Um pool reaproveita as conexões em vez de abrir uma por requisição
export const banco = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORTA ?? 3306),
  user: process.env.DB_USUARIO ?? "root",
  password: process.env.DB_SENHA ?? "",
  database: process.env.DB_NOME ?? "estoque",
  decimalNumbers: true, // DECIMAL (o preço) chega como número, não como texto
});

// Quem executa o SQL: o pool (uma consulta solta) ou uma conexão (dentro de uma transação)
export type Executor = Pick<Pool, "execute">;

// Executa vários comandos como um só: ou todos acontecem, ou nenhum.
// Assim o produto e o seu log nunca ficam fora de sincronia.
export async function emTransacao<T>(trabalho: (conexao: PoolConnection) => Promise<T>): Promise<T> {
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
