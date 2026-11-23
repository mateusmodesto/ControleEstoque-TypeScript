export type Categoria = "alimentos" | "limpeza" | "papelaria" | "eletronicos";
export type Situacao = "normal" | "baixo" | "esgotado";

export interface Produto {
    readonly id: number;
    nome: string;
    descricao?: string;
    categoria: Categoria;
    setorId: number;
    setorNome: string; // o setor responsável pelo produto
    quantidade: number;
    estoqueMinimo: number;
    preco: number;
    criadoEm: Date;
}

// Quem está logado (Aula 5)
export type Perfil = "administrador" | "setor";

export interface Setor {
    id: number;
    nome: string;
}

export interface Usuario {
    id: number;
    nome: string;
    email: string;
    perfil: Perfil; // administrador enxerga todos os setores
    setorId: number | null;
    setorNome: string | null;
}

// O que guardamos no navegador depois do login
export interface Sessao {
    token: string;
    nome: string;
}

// O que está escolhido nos filtros da tela. Vira a query string de GET /api/produtos;
// "todas"/"todos" = sem filtro nesse critério (e o parâmetro nem vai na URL).
export interface Filtros {
    situacao: Situacao | "todas";
    categoria: Categoria | "todas";
    setorId: number | "todos";
    busca: string;
}

export type TipoMovimentacao = "cadastro" | "entrada" | "saida" | "exclusao";

// Uma linha do log: qual produto, quando e quanto
export interface Movimentacao {
    readonly id: number;
    produtoId: number | null; // null quando o produto já foi excluído
    produtoNome: string;
    setorNome: string;
    tipo: TipoMovimentacao;
    quantidade: number;
    saldo: number;
    criadoEm: Date;
}

// O que o usuário informa ao cadastrar: o resto (id, data) o sistema preenche
export type NovoProduto = Pick<Produto, "nome" | "categoria" | "quantidade" | "estoqueMinimo" | "preco"> & {
    descricao?: string;
    setorId?: number; // só o administrador escolhe; os demais usam o próprio setor
};
