import { campo, elemento, janela, selecao } from "./dom";
import {
    alterarQuantidade,
    cadastrarProduto,
    listarMovimentacoes,
    listarMovimentacoesDoProduto,
    listarProdutos,
    removerProduto,
} from "./api";
import type { Categoria, Movimentacao, Produto, Situacao, TipoMovimentacao } from "./tipos";
import { situacaoDoProduto, valorTotal } from "./servicos";

elemento("nome-do-sistema").textContent = "Controle de Estoque";
elemento("versao").textContent = "v0.4.0";
elemento("data-de-hoje").textContent = new Date().toLocaleDateString("pt-BR");

// Começa vazia: quem preenche é a API (e por isso é let, não const)
let lista: Produto[] = [];

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

function mostrarErro(erro: unknown): void {
    elemento("erro").textContent = erro instanceof Error ? erro.message : "Erro inesperado.";
}

// Uma ajudante para criar botões sem repetir código
function botao(texto: string, extra: string, aoClicar: () => void): HTMLButtonElement {
    const elementoBotao = document.createElement("button");
    elementoBotao.type = "button";
    elementoBotao.className = `botao botao--pequeno ${extra}`;
    elementoBotao.textContent = texto;
    elementoBotao.addEventListener("click", aoClicar); // callback, de novo
    return elementoBotao;
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

    // O botão fecha sobre o SEU produto e abre o pop-up de edição
    const celulaAcoes = document.createElement("td");
    celulaAcoes.append(botao("Editar", "", () => abrirEdicao(produto.id)));

    linha.append(celulaNome, celulaCategoria, celulaQuantidade, celulaPreco, celulaSituacao, celulaData, celulaAcoes);
    return linha;
}

// Linha exibida quando não há nenhum produto cadastrado
function criarLinhaVazia(): HTMLTableRowElement {
    const linha = document.createElement("tr");
    const celula = document.createElement("td");
    celula.colSpan = 7;
    celula.className = "tabela__vazio";
    celula.textContent = "Nenhum produto cadastrado.";
    linha.append(celula);
    return linha;
}

// A função que desenha a tela inteira a partir da lista
function desenhar(): void {
    // map: cada produto vira uma linha da tabela
    const linhas = lista.map(criarLinha);
    elemento("lista").replaceChildren(...(linhas.length > 0 ? linhas : [criarLinhaVazia()]));

    // filter: só os que passam no teste
    const baixos = lista.filter((p) => situacaoDoProduto(p) !== "normal");
    // reduce: soma as quantidades de todos os produtos
    const itens = lista.reduce((soma, p) => soma + p.quantidade, 0);
    elemento("total").textContent = String(lista.length);
    elemento("itens").textContent = String(itens);
    elemento("baixos").textContent = String(baixos.length);
    elemento("valor").textContent = formatarMoeda(valorTotal(lista));

    // Aviso: o primeiro produto que precisa de reposição
    const critico = baixos[0];
    const aviso = elemento("repor");
    if (critico) {
        aviso.textContent = `Repor primeiro: #${critico.id} ${critico.nome} (${critico.quantidade} em estoque, mínimo ${critico.estoqueMinimo})`;
        aviso.hidden = false;
    } else {
        aviso.hidden = true;
    }
}

// Erros de carregamento aparecem acima da tabela
function mostrarErroDaTabela(erro: unknown): void {
    elemento("erro-tabela").textContent = erro instanceof Error ? erro.message : "Erro inesperado.";
}

// ---------- Histórico de movimentações (o log) ----------
let movimentacoes: Movimentacao[] = [];

const rotulosDeMovimento: Record<TipoMovimentacao, string> = {
    cadastro: "Cadastro",
    entrada: "Entrada",
    saida: "Saída",
    exclusao: "Exclusão",
};

// Quem aumenta o estoque ganha "+", quem diminui ganha "−"
const aumentaEstoque: Record<TipoMovimentacao, boolean> = {
    cadastro: true,
    entrada: true,
    saida: false,
    exclusao: false,
};

function criarLinhaDeMovimento(mov: Movimentacao): HTMLTableRowElement {
    const linha = document.createElement("tr");

    const celulaQuando = document.createElement("td");
    celulaQuando.textContent = mov.criadoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    const celulaProduto = document.createElement("td");
    celulaProduto.className = "produto__nome";
    celulaProduto.textContent = mov.produtoNome;

    const celulaTipo = document.createElement("td");
    const etiqueta = document.createElement("span");
    etiqueta.className = `etiqueta etiqueta--${mov.tipo}`;
    etiqueta.textContent = rotulosDeMovimento[mov.tipo];
    celulaTipo.append(etiqueta);

    const celulaQuanto = document.createElement("td");
    const mais = aumentaEstoque[mov.tipo];
    celulaQuanto.className = `tabela__numero ${mais ? "movimento--mais" : "movimento--menos"}`;
    celulaQuanto.textContent = `${mais ? "+" : "−"}${mov.quantidade} un.`;

    const celulaSaldo = document.createElement("td");
    celulaSaldo.className = "tabela__numero";
    celulaSaldo.textContent = `${mov.saldo} un.`;

    linha.append(celulaQuando, celulaProduto, celulaTipo, celulaQuanto, celulaSaldo);
    return linha;
}

function desenharHistorico(): void {
    const linhas = movimentacoes.map(criarLinhaDeMovimento);
    if (linhas.length === 0) {
        const vazia = document.createElement("tr");
        const celula = document.createElement("td");
        celula.colSpan = 5;
        celula.className = "tabela__vazio";
        celula.textContent = "Nenhuma movimentação registrada.";
        vazia.append(celula);
        linhas.push(vazia);
    }
    elemento("historico").replaceChildren(...linhas);
}

// ---------- Linha do tempo (em texto) do pop-up de edição ----------
// Cada tipo de movimento vira uma frase
const frasesDeMovimento: Record<TipoMovimentacao, (quantidade: number) => string> = {
    cadastro: (q) => `Cadastrado com ${q} un.`,
    entrada: (q) => `Entrada de ${q} un.`,
    saida: (q) => `Saída de ${q} un.`,
    exclusao: (q) => `Excluído (havia ${q} un.)`,
};

function criarItemDaLinhaDoTempo(mov: Movimentacao): HTMLLIElement {
    const item = document.createElement("li");
    item.className = `tempo__item tempo__item--${mov.tipo}`;

    const texto = document.createElement("span");
    texto.className = "tempo__texto";
    texto.textContent = frasesDeMovimento[mov.tipo](mov.quantidade);

    const detalhe = document.createElement("span");
    const quando = mov.criadoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    detalhe.className = "tempo__detalhe";
    detalhe.textContent = `${quando} · saldo: ${mov.saldo} un.`;

    item.append(texto, detalhe);
    return item;
}

function desenharLinhaDoTempo(lista: Movimentacao[]): void {
    const itens = lista.map(criarItemDaLinhaDoTempo);
    if (itens.length === 0) {
        const vazio = document.createElement("li");
        vazio.className = "tempo__vazio";
        vazio.textContent = "Nenhuma movimentação para este produto.";
        itens.push(vazio);
    }
    elemento("historico-produto").replaceChildren(...itens);
}

// O log só do produto aberto no pop-up de edição
async function carregarHistoricoDoProduto(id: number): Promise<void> {
    try {
        const doProduto = await listarMovimentacoesDoProduto(id);
        if (id !== idEmEdicao) return; // o usuário já abriu outro produto: descarta a resposta antiga
        desenharLinhaDoTempo(doProduto);
    } catch (erro) {
        elemento("erro-edicao").textContent = erro instanceof Error ? erro.message : "Erro inesperado.";
    }
}

// O banco é quem escreve o log; aqui só buscamos a versão mais recente
async function carregarHistorico(): Promise<void> {
    try {
        movimentacoes = await listarMovimentacoes();
        desenharHistorico();
    } catch (erro) {
        mostrarErroDaTabela(erro);
    }
}

// ---------- Pop-up de edição ----------
const janelaEdicao = janela("janela-edicao");

// Qual produto está aberto na janela. undefined = nenhum (por isso o "| undefined")
let idEmEdicao: number | undefined;

function produtoEmEdicao(): Produto | undefined {
    return lista.find((p) => p.id === idEmEdicao);
}

// Copia os dados do produto para dentro da janela
function preencherEdicao(produto: Produto): void {
    const situacao = situacaoDoProduto(produto);
    elemento("edicao-nome").textContent = `#${produto.id} ${produto.nome}`;
    elemento("edicao-categoria").textContent = rotulosDeCategoria[produto.categoria];
    elemento("edicao-preco").textContent = formatarMoeda(produto.preco);
    elemento("edicao-minimo").textContent = `${produto.estoqueMinimo} un.`;
    elemento("edicao-situacao").textContent = rotulosDeSituacao[situacao];
    elemento("edicao-quantidade").textContent = `${produto.quantidade} un.`;
}

function abrirEdicao(id: number): void {
    idEmEdicao = id;
    const produto = produtoEmEdicao();
    if (!produto) return;
    preencherEdicao(produto);
    campo("edicao-valor").value = "1";
    elemento("erro-edicao").textContent = "";
    elemento("historico-produto").replaceChildren(); // limpa o do produto anterior
    void carregarHistoricoDoProduto(id);
    janelaEdicao.showModal();
}

// O par que se repete: 1. o banco confirma  2. o estado muda sem ser alterado  3. a tela acompanha
// sinal = +1 adiciona ao estoque, -1 retira do estoque
async function movimentar(sinal: 1 | -1): Promise<void> {
    const produto = produtoEmEdicao();
    if (!produto) return;
    elemento("erro-edicao").textContent = "";

    const valor = campo("edicao-valor").valueAsNumber;
    if (!Number.isInteger(valor) || valor < 1) {
        elemento("erro-edicao").textContent = "Informe uma quantidade inteira maior que zero.";
        return;
    }
    const quantidade = produto.quantidade + sinal * valor;
    if (quantidade < 0) {
        elemento("erro-edicao").textContent = `Não há estoque suficiente: só existem ${produto.quantidade} un.`;
        return;
    }

    try {
        await alterarQuantidade(produto.id, quantidade);
        lista = lista.map((p) => (p.id === produto.id ? { ...p, quantidade } : p));
        desenhar();
        void carregarHistorico();
        void carregarHistoricoDoProduto(produto.id);
        const atualizado = produtoEmEdicao();
        if (atualizado) preencherEdicao(atualizado); // a janela mostra o novo estoque
        campo("edicao-valor").value = "1";
    } catch (erro) {
        elemento("erro-edicao").textContent = erro instanceof Error ? erro.message : "Erro inesperado.";
    }
}

async function excluir(): Promise<void> {
    const produto = produtoEmEdicao();
    if (!produto) return;
    // confirm: a pergunta "tem certeza?" do navegador. Apagar não tem volta.
    if (!confirm(`Excluir "${produto.nome}" do estoque? Esta ação não pode ser desfeita.`)) return;

    try {
        await removerProduto(produto.id);
        lista = lista.filter((p) => p.id !== produto.id);
        desenhar();
        void carregarHistorico();
        janelaEdicao.close();
    } catch (erro) {
        elemento("erro-edicao").textContent = erro instanceof Error ? erro.message : "Erro inesperado.";
    }
}

elemento("adicionar-estoque").addEventListener("click", () => movimentar(1));
elemento("retirar-estoque").addEventListener("click", () => movimentar(-1));
elemento("excluir-produto").addEventListener("click", excluir);
elemento("fechar-edicao").addEventListener("click", () => janelaEdicao.close());

// Clicar no fundo escurecido também fecha, como no pop-up de cadastro
janelaEdicao.addEventListener("click", (evento) => {
    if (evento.target === janelaEdicao) {
        janelaEdicao.close();
    }
});

// A janela (pop-up) de cadastro: um <dialog> do HTML
const janelaCadastro = janela("janela-cadastro");

elemento("abrir-cadastro").addEventListener("click", () => {
    elemento("erro").textContent = "";
    janelaCadastro.showModal(); // abre por cima da página, com o fundo escurecido
    campo("nome").focus();
});

elemento("cancelar-cadastro").addEventListener("click", () => {
    janelaCadastro.close();
});

// Clicar no fundo escurecido (fora da janela) também fecha
janelaCadastro.addEventListener("click", (evento) => {
    if (evento.target === janelaCadastro) {
        janelaCadastro.close();
    }
});

// O formulário: o cadastro agora vai para o banco (async: espera a API responder)
elemento("formulario").addEventListener("submit", async (evento) => {
    evento.preventDefault(); // sem isto, a página recarrega e tudo se perde
    elemento("erro").textContent = "";
    try {
        const novo = await cadastrarProduto({
            nome: campo("nome").value.trim(),
            categoria: selecao("categoria").value as Categoria,
            quantidade: campo("quantidade").valueAsNumber,
            estoqueMinimo: campo("minimo").valueAsNumber,
            preco: campo("preco").valueAsNumber,
        });
        lista = [...lista, novo]; // acrescentar sem alterar: uma lista nova
        campo("nome").value = "";
        campo("quantidade").value = "0";
        campo("preco").value = "";
        desenhar();
        void carregarHistorico();
        janelaCadastro.close(); // deu certo: fecha o pop-up
    } catch (erro) {
        mostrarErro(erro); // continua aberto, mostrando o erro
    }
});

async function iniciar(): Promise<void> {
    try {
        lista = await listarProdutos();
        desenhar();
        await carregarHistorico();
    } catch (erro) {
        mostrarErroDaTabela(erro);
    }
}

desenhar(); // tela vazia enquanto a API responde
desenharHistorico();
iniciar();
