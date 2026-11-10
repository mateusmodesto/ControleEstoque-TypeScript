import type { Produto, Situacao } from "./tipos";

// Classifica o produto pela quantidade em estoque
export function situacaoDoProduto(produto: Produto): Situacao {
    if (produto.quantidade === 0) return "esgotado";
    if (produto.quantidade < produto.estoqueMinimo) return "baixo";
    return "normal";
}

// Valor total parado em estoque (quantidade x preço de cada produto)
export function valorTotal(lista: Produto[]): number {
    let total = 0;
    for (const produto of lista) {
        total += produto.quantidade * produto.preco;
    }
    return total;
}

// Função de alta ordem: recebe uma lista e uma regra
export function transformar<T, R>(lista: T[], regra: (item: T) => R): R[] {
    const resultado: R[] = [];
    for (const item of lista) {
        resultado.push(regra(item));
    }
    return resultado;
}
