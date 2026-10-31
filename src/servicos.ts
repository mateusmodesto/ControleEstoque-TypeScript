import type { NovoProduto, Produto, Situacao } from "./tipos";

// Gera o próximo id a partir do maior id já existente
function gerarId(lista: Produto[]): number {
    let maior = 0;
    for (const produto of lista) {
        if (produto.id > maior) {
            maior = produto.id;
        }
    }
    return maior + 1;
}

// Cadastra um produto: o usuário informa só o essencial
export function adicionarProduto(lista: Produto[], dados: NovoProduto): Produto {
    if (dados.nome.trim().length < 3) {
        throw new Error("O nome precisa ter pelo menos 3 caracteres.");
    }
    if (!Number.isInteger(dados.quantidade) || dados.quantidade < 0) {
        throw new Error("A quantidade deve ser um número inteiro maior ou igual a zero.");
    }
    if (!Number.isInteger(dados.estoqueMinimo) || dados.estoqueMinimo < 0) {
        throw new Error("O estoque mínimo deve ser um número inteiro maior ou igual a zero.");
    }
    if (!(dados.preco > 0)) {
        throw new Error("O preço deve ser maior que zero.");
    }
    const produto: Produto = {
        ...dados,
        id: gerarId(lista),
        criadoEm: new Date(),
    };
    lista.push(produto);
    return produto;
}

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
