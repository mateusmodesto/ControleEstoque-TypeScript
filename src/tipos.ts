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

// O que o usuário informa ao cadastrar: o resto (id, data) o sistema preenche
export type NovoProduto = Pick<Produto, "nome" | "categoria" | "quantidade" | "estoqueMinimo" | "preco"> & {
    descricao?: string;
};
