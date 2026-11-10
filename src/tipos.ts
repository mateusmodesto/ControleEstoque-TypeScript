export type Categoria = "alimentos" | "limpeza" | "papelaria" | "eletronicos";
export type Situacao = "normal" | "baixo" | "esgotado";

export interface Produto {
    readonly id: number;
    nome: string;
    descricao?: string;
    categoria: Categoria;
    quantidade: number;
    estoqueMinimo: number;
    preco: number;
    criadoEm: Date;
}

export type TipoMovimentacao = "cadastro" | "entrada" | "saida" | "exclusao";

// Uma linha do log: qual produto, quando e quanto
export interface Movimentacao {
    readonly id: number;
    produtoId: number | null; // null quando o produto já foi excluído
    produtoNome: string;
    tipo: TipoMovimentacao;
    quantidade: number;
    saldo: number;
    criadoEm: Date;
}

// O que o usuário informa ao cadastrar: o resto (id, data) o sistema preenche
export type NovoProduto = Pick<Produto, "nome" | "categoria" | "quantidade" | "estoqueMinimo" | "preco"> & {
    descricao?: string;
};
