import type { Produto } from "./tipos";

// JSON não tem data: criadoEm chega como texto e precisa virar Date
function converter(bruto: Produto): Produto {
  return { ...bruto, criadoEm: new Date(bruto.criadoEm) };
}

// Todos os produtos que estão no banco
export async function listarProdutos(): Promise<Produto[]> {
  const resposta = await fetch("/api/produtos");
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar os produtos. A API está rodando?");
  }
  const bruto = (await resposta.json()) as Produto[];
  return bruto.map(converter);
}

// Um produto: devolve undefined se ele não existir (o mesmo padrão do find)
export async function buscarProduto(id: number): Promise<Produto | undefined> {
  const resposta = await fetch(`/api/produtos/${id}`);
  if (resposta.status === 404) {
    return undefined;
  }
  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao buscar o produto #${id}.`);
  }
  return converter((await resposta.json()) as Produto);
}
