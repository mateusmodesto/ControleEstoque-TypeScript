export type Categoria = "alimentos" | "limpeza" | "papelaria" | "eletronicos";

export type TipoMovimentacao = "cadastro" | "entrada" | "saida" | "exclusao";

export const CATEGORIAS: Categoria[] = ["alimentos", "limpeza", "papelaria", "eletronicos"];

// O que chega no corpo do POST. Tudo é opcional porque quem
// manda é o navegador: a API confere antes de usar.
export interface DadosProduto {
  nome?: string;
  descricao?: string | null;
  categoria?: Categoria;
  quantidade?: number;
  estoqueMinimo?: number;
  preco?: number;
}
