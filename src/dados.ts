import type { Produto } from "./tipos";

export const produtos: Produto[] = [
    { id: 1, nome: "Arroz 5kg", categoria: "alimentos", quantidade: 40, estoqueMinimo: 10, preco: 29.9, criadoEm: new Date() },
    { id: 2, nome: "Detergente", descricao: "Caixa com 12 unidades", categoria: "limpeza", quantidade: 4, estoqueMinimo: 8, preco: 24.5, criadoEm: new Date() },
    { id: 3, nome: "Caderno 96 folhas", categoria: "papelaria", quantidade: 120, estoqueMinimo: 30, preco: 14.9, criadoEm: new Date() },
    { id: 4, nome: "Mouse sem fio", descricao: "Modelo USB", categoria: "eletronicos", quantidade: 0, estoqueMinimo: 5, preco: 59.9, criadoEm: new Date() },
    { id: 5, nome: "Feijão 1kg", categoria: "alimentos", quantidade: 6, estoqueMinimo: 15, preco: 8.7, criadoEm: new Date() },
    { id: 6, nome: "Caneta azul", categoria: "papelaria", quantidade: 200, estoqueMinimo: 50, preco: 2.5, criadoEm: new Date() },
];
