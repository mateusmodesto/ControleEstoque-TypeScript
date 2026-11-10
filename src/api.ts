import type { Movimentacao, NovoProduto, Produto } from "./tipos";

// A ajudante que todas as chamadas usam: monta o pedido e trata o erro
async function enviar(metodo: string, url: string, corpo?: unknown): Promise<Response> {
  const resposta = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    // a API manda { erro: "..." }; se não mandar, usamos o código
    const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
    throw new Error(dados.erro ?? `Erro ${resposta.status}`);
  }
  return resposta;
}

// JSON não tem data: criadoEm chega como texto e precisa virar Date
function converter(produto: Produto): Produto {
  return { ...produto, criadoEm: new Date(produto.criadoEm) };
}

export async function listarProdutos(): Promise<Produto[]> {
  const resposta = await enviar("GET", "/api/produtos");
  const bruto = (await resposta.json()) as Produto[];
  return bruto.map(converter);
}

// O log: as movimentações mais recentes primeiro
export async function listarMovimentacoes(): Promise<Movimentacao[]> {
  const resposta = await enviar("GET", "/api/movimentacoes");
  const bruto = (await resposta.json()) as Movimentacao[];
  return bruto.map((m) => ({ ...m, criadoEm: new Date(m.criadoEm) }));
}

// O log de um único produto
export async function listarMovimentacoesDoProduto(id: number): Promise<Movimentacao[]> {
  const resposta = await enviar("GET", `/api/produtos/${id}/movimentacoes`);
  const bruto = (await resposta.json()) as Movimentacao[];
  return bruto.map((m) => ({ ...m, criadoEm: new Date(m.criadoEm) }));
}

export async function cadastrarProduto(dados: NovoProduto): Promise<Produto> {
  const resposta = await enviar("POST", "/api/produtos", dados);
  return converter((await resposta.json()) as Produto);
}

export async function alterarQuantidade(id: number, quantidade: number): Promise<void> {
  await enviar("PATCH", `/api/produtos/${id}/quantidade`, { quantidade });
}

export async function removerProduto(id: number): Promise<void> {
  await enviar("DELETE", `/api/produtos/${id}`);
}
