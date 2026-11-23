import "dotenv/config"; // primeira linha: carrega o .env antes de tudo
import express, { type NextFunction, type Request, type Response } from "express";
import { exigirLogin } from "./autenticacao";
import { ErroHttp } from "./erros";
import { rotasDeMovimentacoes } from "./rotas/movimentacoes";
import { rotasDeProdutos } from "./rotas/produtos";
import { rotasDeSetores } from "./rotas/setores";
import { rotasDeUsuarios } from "./rotas/usuarios";

// Este arquivo só LIGA as peças. Cada camada tem a sua pasta:
//   rotas/     HTTP: lê o pedido e escolhe o código da resposta
//   servicos/  as regras do negócio (validar, decidir, transação)
//   dados/     só SQL
const app = express();
app.use(express.json());

// Públicas
app.use("/api/setores", rotasDeSetores);
app.use("/api", rotasDeUsuarios); // /api/usuarios e /api/login (e /api/eu, que exige login por conta própria)

// Daqui para baixo, tudo exige login: sem token válido, a resposta é 401
app.use("/api/produtos", exigirLogin, rotasDeProdutos);
app.use("/api/movimentacoes", exigirLogin, rotasDeMovimentacoes);

// ---------- ERROS: sempre depois de todas as rotas ----------
// Um só lugar transforma qualquer erro em resposta. Os serviços lançam ErroHttp
// (com o código HTTP dentro); o resto é imprevisto e vira 500.
app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (erro instanceof ErroHttp) {
    res.status(erro.status).json({ erro: erro.message });
    return;
  }
  // corpo que não é um JSON válido: o erro é de quem mandou, não do servidor
  if ((erro as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ erro: "O corpo do pedido não é um JSON válido." });
    return;
  }
  console.error(erro); // o detalhe técnico fica só no terminal
  res.status(500).json({ erro: "Algo deu errado no servidor. Tente de novo." });
});

app.listen(3000, () => console.log("API do Controle de Estoque em http://localhost:3000"));
