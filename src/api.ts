import type { Filtros, Movimentacao, NovoProduto, Produto, Sessao, Setor, Usuario } from "./tipos";

const CHAVE_SESSAO = "estoque:sessao";

// ---------- Sessão: o token guardado no navegador (Aula 5) ----------

export function sessaoAtual(): Sessao | undefined {
  try {
    const texto = localStorage.getItem(CHAVE_SESSAO);
    return texto ? (JSON.parse(texto) as Sessao) : undefined;
  } catch {
    return undefined; // armazenamento bloqueado ou valor corrompido: é como não ter sessão
  }
}

export function guardarSessao(sessao: Sessao): void {
  localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
}

export function encerrarSessao(): void {
  localStorage.removeItem(CHAVE_SESSAO);
}

// A ajudante que todas as chamadas usam: monta o pedido e trata o erro
async function enviar(metodo: string, url: string, corpo?: unknown): Promise<Response> {
  const sessao = sessaoAtual();
  const resposta = await fetch(url, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      // com sessão, cada pedido leva o token no cabeçalho
      ...(sessao ? { Authorization: `Bearer ${sessao.token}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

  // token vencido ou inválido: volta para a tela de entrada
  if (resposta.status === 401 && sessao) {
    encerrarSessao();
    location.reload();
  }

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

// Sem filtros: o estoque inteiro. Com filtros: quem filtra é o BANCO (WHERE),
// e só o que está ligado vai na URL, ex.: /api/produtos?situacao=baixo&busca=feij
export async function listarProdutos(filtros?: Filtros): Promise<Produto[]> {
  const parametros = new URLSearchParams(); // já cuida de acentos e caracteres especiais
  if (filtros) {
    if (filtros.situacao !== "todas") parametros.set("situacao", filtros.situacao);
    if (filtros.categoria !== "todas") parametros.set("categoria", filtros.categoria);
    if (filtros.setorId !== "todos") parametros.set("setorId", String(filtros.setorId));
    if (filtros.busca.trim() !== "") parametros.set("busca", filtros.busca.trim());
  }
  const consulta = parametros.toString();
  const resposta = await enviar("GET", consulta === "" ? "/api/produtos" : `/api/produtos?${consulta}`);
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

// ---------- Usuários ----------

export async function entrar(email: string, senha: string): Promise<Sessao> {
  const resposta = await enviar("POST", "/api/login", { email, senha });
  return (await resposta.json()) as Sessao;
}

export async function criarConta(nome: string, email: string, senha: string, setorId: number): Promise<void> {
  await enviar("POST", "/api/usuarios", { nome, email, senha, setorId });
}

// A lista é pública: a tela de criar conta precisa dela antes do login
export async function listarSetores(): Promise<Setor[]> {
  const resposta = await enviar("GET", "/api/setores");
  return (await resposta.json()) as Setor[];
}

export async function buscarEu(): Promise<Usuario> {
  const resposta = await enviar("GET", "/api/eu");
  return (await resposta.json()) as Usuario;
}
