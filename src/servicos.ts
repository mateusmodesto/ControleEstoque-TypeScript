import type { Categoria, Produto, Situacao } from "./tipos";

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

// ---------- Aula 6: filtros e busca ----------

// O que o usuário escolheu na tela. "todas"/"todos" = sem filtro nesse critério.
export interface Filtros {
    situacao: Situacao | "todas";
    categoria: Categoria | "todas";
    setorId: number | "todos";
    busca: string;
}

export function filtrarPorSituacao(lista: Produto[], situacao: Situacao): Produto[] {
    return lista.filter((p) => situacaoDoProduto(p) === situacao);
}

export function filtrarPorCategoria(lista: Produto[], categoria: Categoria): Produto[] {
    return lista.filter((p) => p.categoria === categoria);
}

export function filtrarPorSetor(lista: Produto[], setorId: number): Produto[] {
    return lista.filter((p) => p.setorId === setorId);
}

// Tira acentos e maiúsculas: quem digita "feijao" encontra "Feijão"
function simplificar(texto: string): string {
    return texto
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
}

// Procura no nome e também na descrição
export function pesquisar(lista: Produto[], termo: string): Produto[] {
    const procurado = simplificar(termo.trim());
    return lista.filter(
        (p) => simplificar(p.nome).includes(procurado) || simplificar(p.descricao ?? "").includes(procurado),
    );
}

// Aplica só os filtros que estão ligados, um depois do outro
export function aplicarFiltros(lista: Produto[], filtros: Filtros): Produto[] {
    let resultado = lista;
    if (filtros.situacao !== "todas") {
        resultado = filtrarPorSituacao(resultado, filtros.situacao);
    }
    if (filtros.categoria !== "todas") {
        resultado = filtrarPorCategoria(resultado, filtros.categoria);
    }
    if (filtros.setorId !== "todos") {
        resultado = filtrarPorSetor(resultado, filtros.setorId);
    }
    if (filtros.busca.trim() !== "") {
        resultado = pesquisar(resultado, filtros.busca);
    }
    return resultado;
}

// Quantos produtos há em cada situação (os números dos botões de filtro)
export function contarPorSituacao(lista: Produto[]): Record<Situacao, number> {
    return lista.reduce<Record<Situacao, number>>(
        (contagem, produto) => {
            contagem[situacaoDoProduto(produto)]++;
            return contagem;
        },
        { normal: 0, baixo: 0, esgotado: 0 },
    );
}
