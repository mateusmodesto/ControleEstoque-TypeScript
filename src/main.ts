import { campo, elemento, selecao } from "./dom";
import { produtos } from "./dados";
import type { Categoria, Produto, Situacao } from "./tipos";
import { adicionarProduto, situacaoDoProduto, transformar, valorTotal } from "./servicos";

elemento("nome-do-sistema").textContent = "Controle de Estoque";
elemento("versao").textContent = "v0.2.0";
elemento("data-de-hoje").textContent = new Date().toLocaleDateString("pt-BR");

console.log("Controle de Estoque iniciado."); // aparece no F12

// O estado do programa: a lista que está valendo agora
const lista: Produto[] = [...produtos];

const rotulosDeSituacao: Record<Situacao, string> = {
    normal: "Normal",
    baixo: "Estoque baixo",
    esgotado: "Esgotado",
};

const rotulosDeCategoria: Record<Categoria, string> = {
    alimentos: "Alimentos",
    limpeza: "Limpeza",
    papelaria: "Papelaria",
    eletronicos: "Eletrônicos",
};

function formatarMoeda(valor: number): string {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Um produto vira uma linha <tr> da tabela
function criarLinha(produto: Produto): HTMLTableRowElement {
    const situacao = situacaoDoProduto(produto);
    const linha = document.createElement("tr");
    if (situacao === "esgotado") linha.className = "produto--esgotado";

    const celulaNome = document.createElement("td");
    const nome = document.createElement("span");
    nome.className = "produto__nome";
    nome.textContent = `#${produto.id} ${produto.nome}`;
    celulaNome.append(nome);
    if (produto.descricao) {
        const descricao = document.createElement("span");
        descricao.className = "tabela__detalhe";
        descricao.textContent = produto.descricao;
        celulaNome.append(descricao);
    }

    const celulaCategoria = document.createElement("td");
    const categoria = document.createElement("span");
    categoria.className = "etiqueta etiqueta--categoria";
    categoria.textContent = rotulosDeCategoria[produto.categoria];
    celulaCategoria.append(categoria);

    const celulaQuantidade = document.createElement("td");
    celulaQuantidade.className = "tabela__numero";
    celulaQuantidade.textContent = `${produto.quantidade} un.`;
    const minimo = document.createElement("span");
    minimo.className = "tabela__detalhe";
    minimo.textContent = `mín. ${produto.estoqueMinimo}`;
    celulaQuantidade.append(minimo);

    const celulaPreco = document.createElement("td");
    celulaPreco.className = "tabela__numero";
    celulaPreco.textContent = formatarMoeda(produto.preco);

    const celulaSituacao = document.createElement("td");
    const etiqueta = document.createElement("span");
    etiqueta.className = `etiqueta etiqueta--${situacao}`;
    etiqueta.textContent = rotulosDeSituacao[situacao];
    celulaSituacao.append(etiqueta);

    const celulaData = document.createElement("td");
    celulaData.textContent = produto.criadoEm.toLocaleDateString("pt-BR");

    linha.append(celulaNome, celulaCategoria, celulaQuantidade, celulaPreco, celulaSituacao, celulaData);
    return linha;
}

// Linha exibida quando não há nenhum produto cadastrado
function criarLinhaVazia(): HTMLTableRowElement {
    const linha = document.createElement("tr");
    const celula = document.createElement("td");
    celula.colSpan = 6;
    celula.className = "tabela__vazio";
    celula.textContent = "Nenhum produto cadastrado.";
    linha.append(celula);
    return linha;
}

// A função que desenha a tela inteira a partir da lista
function desenhar(): void {
    const linhas = transformar(lista, criarLinha); // função de alta ordem
    elemento("lista").replaceChildren(...(linhas.length > 0 ? linhas : [criarLinhaVazia()]));

    let itens = 0;
    let baixos = 0;
    for (const produto of lista) {
        itens += produto.quantidade;
        if (situacaoDoProduto(produto) !== "normal") {
            baixos++;
        }
    }
    elemento("total").textContent = String(lista.length);
    elemento("itens").textContent = String(itens);
    elemento("baixos").textContent = String(baixos);
    elemento("valor").textContent = formatarMoeda(valorTotal(lista));

    // Aviso: o primeiro produto que precisa de reposição
    const critico = lista.find((p) => situacaoDoProduto(p) !== "normal");
    const aviso = elemento("repor");
    if (critico) {
        aviso.textContent = `Repor primeiro: #${critico.id} ${critico.nome} (${critico.quantidade} em estoque, mínimo ${critico.estoqueMinimo})`;
        aviso.hidden = false;
    } else {
        aviso.hidden = true;
    }
}

// O formulário: a função abaixo é um CALLBACK — quem a chama é o navegador
elemento("formulario").addEventListener("submit", (evento) => {
    evento.preventDefault(); // sem isto, a página recarrega e tudo se perde
    elemento("erro").textContent = "";
    try {
        adicionarProduto(lista, {
            nome: campo("nome").value.trim(),
            categoria: selecao("categoria").value as Categoria,
            quantidade: campo("quantidade").valueAsNumber,
            estoqueMinimo: campo("minimo").valueAsNumber,
            preco: campo("preco").valueAsNumber,
        });
        campo("nome").value = "";
        campo("quantidade").value = "0";
        campo("preco").value = "";
        desenhar(); // mudou a lista? desenhe de novo
    } catch (erro) {
        if (erro instanceof Error) {
            elemento("erro").textContent = erro.message;
        }
    }
});

desenhar(); // primeiro desenho da tela
