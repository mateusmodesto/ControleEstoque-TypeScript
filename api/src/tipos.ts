// Os tipos da API. Todas as camadas (rotas, serviços e dados) falam estes tipos.

export type Categoria = "alimentos" | "limpeza" | "papelaria" | "eletronicos";
export type Situacao = "normal" | "baixo" | "esgotado";
export type TipoMovimentacao = "cadastro" | "entrada" | "saida" | "exclusao";

// administrador enxerga todos os setores; setor só enxerga o seu
export type Perfil = "administrador" | "setor";

export const CATEGORIAS: readonly Categoria[] = ["alimentos", "limpeza", "papelaria", "eletronicos"];
export const SITUACOES: readonly Situacao[] = ["normal", "baixo", "esgotado"];

// ---------- O que sai do banco (o espelho das tabelas) ----------

export interface Setor {
  id: number;
  nome: string;
}

export interface Produto {
  readonly id: number;
  nome: string;
  descricao: string | null;
  categoria: Categoria;
  quantidade: number;
  estoqueMinimo: number;
  preco: number;
  setorId: number;
  setorNome: string;
  criadoEm: Date;
}

export interface Movimentacao {
  readonly id: number;
  produtoId: number | null; // null quando o produto já foi excluído
  produtoNome: string;
  setorId: number;
  setorNome: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  saldo: number;
  criadoEm: Date;
}

// ---------- Quem está logado ----------

export interface UsuarioLogado {
  id: number;
  perfil: Perfil;
  setorId: number | null; // null para o administrador
}

// A resposta de GET /api/eu (nunca inclui o senha_hash)
export interface Eu {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  setorId: number | null;
  setorNome: string | null;
}

// ---------- O que chega do navegador ----------

// Corpo do POST de produto. Tudo é opcional porque quem manda é o
// navegador: o serviço confere antes de usar.
export interface DadosProduto {
  nome?: string;
  descricao?: string | null;
  categoria?: Categoria;
  quantidade?: number;
  estoqueMinimo?: number;
  preco?: number;
  setorId?: number; // só o administrador escolhe; os demais usam o próprio setor
}

// Os filtros de GET /api/produtos, já conferidos (o que não veio fica de fora)
export interface FiltrosProduto {
  situacao?: Situacao;
  categoria?: Categoria;
  setorId?: number;
  busca?: string;
}

// ---------- O que a camada de dados recebe para gravar ----------

export interface NovoProdutoDb {
  nome: string;
  descricao: string | null;
  categoria: Categoria;
  setorId: number;
  quantidade: number;
  estoqueMinimo: number;
  preco: number;
}

export interface NovaMovimentacao {
  produtoId: number;
  produtoNome: string;
  setorId: number;
  tipo: TipoMovimentacao;
  quantidade: number;
  saldo: number;
}

// O produto como ele está no banco, travado para alteração (SELECT ... FOR UPDATE)
export interface ProdutoTravado {
  nome: string;
  quantidade: number;
  setorId: number;
}
