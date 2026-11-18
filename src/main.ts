import { campo, elemento, janela, selecao } from "./dom";
import {
    alterarQuantidade,
    buscarEu,
    cadastrarProduto,
    criarConta,
    encerrarSessao,
    entrar,
    guardarSessao,
    listarMovimentacoes,
    listarMovimentacoesDoProduto,
    listarProdutos,
    listarSetores,
    removerProduto,
    sessaoAtual,
} from "./api";
import type { Categoria, Movimentacao, Produto, Setor, Situacao, TipoMovimentacao } from "./tipos";
import { aplicarFiltros, contarPorSituacao, situacaoDoProduto, valorTotal, type Filtros } from "./servicos";

elemento("nome-do-sistema").textContent = "Controle de Estoque";
elemento("versao").textContent = "v0.7.0";
elemento("data-de-hoje").textContent = new Date().toLocaleDateString("pt-BR");

// ---------- Tema claro/escuro (Aula 6) ----------
type Tema = "claro" | "escuro";

// Quem escolhe o tema na abertura da página é o script do <head> (index.html);
// aqui só lemos o que ele colocou no <html>.
function temaAtual(): Tema {
    return document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro";
}

// O CSS troca a paleta olhando o atributo data-tema; o botão diz para onde vai trocar
function mostrarTema(tema: Tema): void {
    document.documentElement.dataset.tema = tema;
    // o ícone mostra para onde vai trocar: sol no escuro, lua no claro
    const botaoDoTema = elemento("botao-tema");
    botaoDoTema.textContent = tema === "escuro" ? "☀" : "☾";
    const dica = tema === "escuro" ? "Mudar para o tema claro" : "Mudar para o tema escuro";
    botaoDoTema.title = dica;
    botaoDoTema.setAttribute("aria-label", dica);
}

mostrarTema(temaAtual());

elemento("botao-tema").addEventListener("click", () => {
    const novo: Tema = temaAtual() === "escuro" ? "claro" : "escuro";
    mostrarTema(novo);
    try {
        localStorage.setItem("estoque:tema", novo); // só guardamos quando a pessoa escolhe
    } catch {
        // sem armazenamento (janela anônima, por exemplo): o tema vale só nesta visita
    }
});

// Começa vazia: quem preenche é a API (e por isso é let, não const)
let lista: Produto[] = [];

// O que está escolhido nos filtros agora (o estado da busca)
const SEM_FILTROS: Filtros = { situacao: "todas", categoria: "todas", setorId: "todos", busca: "" };
const filtros: Filtros = { ...SEM_FILTROS };

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

    // só o administrador enxerga esta coluna (o CSS esconde para os demais)
    const celulaSetor = document.createElement("td");
    celulaSetor.className = "col-setor";
    celulaSetor.textContent = produto.setorNome;

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

    linha.append(celulaNome, celulaCategoria, celulaSetor, celulaQuantidade, celulaPreco, celulaSituacao, celulaData, celulaAcoes);
    return linha;
}

// Linha exibida quando não há nenhum produto cadastrado
function criarLinhaVazia(mensagem: string): HTMLTableRowElement {
    const linha = document.createElement("tr");
    const celula = document.createElement("td");
    celula.colSpan = 8;
    celula.className = "tabela__vazio";
    celula.textContent = mensagem;
    linha.append(celula);
    return linha;
}

// A função que desenha a tela inteira a partir da lista
function desenhar(): void {
    // A tabela mostra só os produtos que passam nos filtros...
    const visiveis = aplicarFiltros(lista, filtros);
    // map: cada produto vira uma linha da tabela
    const linhas = visiveis.map(criarLinha);
    const semResultado =
        lista.length === 0 ? "Nenhum produto cadastrado." : "Nenhum produto encontrado com esses filtros.";
    elemento("lista").replaceChildren(...(linhas.length > 0 ? linhas : [criarLinhaVazia(semResultado)]));
    atualizarFiltros(visiveis.length);

    // ...mas os cartões e o aviso olham o estoque INTEIRO, filtrado ou não.
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

// ---------- Filtros e busca (Aula 6) ----------
function filtrosAtivos(): boolean {
    return (
        filtros.situacao !== "todas" ||
        filtros.categoria !== "todas" ||
        filtros.setorId !== "todos" ||
        filtros.busca.trim() !== ""
    );
}

// Atualiza o que muda junto com os filtros: botão ativo, contagens e o resumo
function atualizarFiltros(quantidadeVisivel: number): void {
    const contagem = contarPorSituacao(lista); // reduce: os números dos botões
    elemento("conta-todas").textContent = String(lista.length);
    elemento("conta-normal").textContent = String(contagem.normal);
    elemento("conta-baixo").textContent = String(contagem.baixo);
    elemento("conta-esgotado").textContent = String(contagem.esgotado);

    for (const botaoDeFiltro of elemento("filtros-situacao").querySelectorAll("button")) {
        botaoDeFiltro.classList.toggle("filtro--ativo", botaoDeFiltro.dataset.situacao === filtros.situacao);
    }

    const resumo = elemento("resumo-filtro");
    resumo.hidden = !filtrosAtivos();
    elemento("resumo-texto").textContent = `Mostrando ${quantidadeVisivel} de ${lista.length} produtos`;
}

// Volta tudo ao normal: o estado E os campos da tela
function limparFiltros(): void {
    Object.assign(filtros, SEM_FILTROS);
    campo("busca").value = "";
    selecao("filtro-categoria").value = "";
    selecao("filtro-setor").value = "";
}

elemento("filtros-situacao").addEventListener("click", (evento) => {
    // o clique pode cair no número dentro do botão: closest sobe até o <button>
    const alvo = evento.target instanceof HTMLElement ? evento.target.closest("button") : null;
    const escolhida = alvo?.dataset.situacao;
    if (!escolhida) return;
    filtros.situacao = escolhida as Filtros["situacao"];
    desenhar();
});

selecao("filtro-categoria").addEventListener("change", () => {
    filtros.categoria = (selecao("filtro-categoria").value || "todas") as Filtros["categoria"];
    desenhar();
});

selecao("filtro-setor").addEventListener("change", () => {
    const escolhido = selecao("filtro-setor").value;
    filtros.setorId = escolhido === "" ? "todos" : Number(escolhido);
    desenhar();
});

campo("busca").addEventListener("input", () => {
    filtros.busca = campo("busca").value;
    desenhar(); // a cada letra digitada a tabela se refaz
});

elemento("limpar-filtros").addEventListener("click", () => {
    limparFiltros();
    desenhar();
});

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

    const celulaSetor = document.createElement("td");
    celulaSetor.className = "col-setor";
    celulaSetor.textContent = mov.setorNome;

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

    linha.append(celulaQuando, celulaProduto, celulaSetor, celulaTipo, celulaQuanto, celulaSaldo);
    return linha;
}

function desenharHistorico(): void {
    const linhas = movimentacoes.map(criarLinhaDeMovimento);
    if (linhas.length === 0) {
        const vazia = document.createElement("tr");
        const celula = document.createElement("td");
        celula.colSpan = 6;
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
    elemento("edicao-setor").textContent = produto.setorNome;
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
        // O administrador escolhe o setor; para os demais o campo nem aparece
        // e a API usa o setor de quem está logado.
        const ehAdmin = document.body.dataset.perfil === "administrador";
        const novo = await cadastrarProduto({
            nome: campo("nome").value.trim(),
            categoria: selecao("categoria").value as Categoria,
            setorId: ehAdmin ? Number(selecao("setor").value) : undefined,
            quantidade: campo("quantidade").valueAsNumber,
            estoqueMinimo: campo("minimo").valueAsNumber,
            preco: campo("preco").valueAsNumber,
        });
        lista = [...lista, novo]; // acrescentar sem alterar: uma lista nova
        limparFiltros(); // senão o produto novo poderia ficar escondido por um filtro
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

// ---------- Entrada: login e criação de conta (Aula 5) ----------
function mostrarErroEntrada(erro: unknown): void {
    elemento("erro-entrada").textContent = erro instanceof Error ? erro.message : "Erro inesperado.";
}

// ---------- Setores ----------
// Preenche um <select> com os setores, mantendo a opção "Selecione..." do HTML
function preencherSetores(caixa: HTMLSelectElement, setores: Setor[]): void {
    const marcador = caixa.querySelector<HTMLOptionElement>('option[value=""]');
    const opcoes = setores.map((setor) => {
        const opcao = document.createElement("option");
        opcao.value = String(setor.id);
        opcao.textContent = setor.nome;
        return opcao;
    });
    caixa.replaceChildren(...(marcador ? [marcador] : []), ...opcoes);
}

// A lista é pública: serve à tela de criar conta e ao cadastro do administrador
async function carregarSetores(): Promise<void> {
    try {
        const setores = await listarSetores();
        preencherSetores(selecao("criar-setor"), setores);
        preencherSetores(selecao("setor"), setores);
        preencherSetores(selecao("filtro-setor"), setores);
    } catch (erro) {
        mostrarErroEntrada(erro);
    }
}

// criando = true mostra "Criar conta"; false mostra "Entrar"
function mostrarFormulario(criando: boolean): void {
    elemento("form-criar").hidden = !criando;
    elemento("form-entrar").hidden = criando;
    elemento("entrada-titulo").textContent = criando ? "Criar conta" : "Entrar";
    elemento("entrada-texto").textContent = criando
        ? "Preencha os dados para começar a usar o sistema."
        : "Acesse o controle de estoque com a sua conta.";
    elemento("alternar-entrada").textContent = criando ? "Já tenho conta" : "Ainda não tenho conta";
    elemento("erro-entrada").textContent = "";
}

elemento("alternar-entrada").addEventListener("click", () => {
    mostrarFormulario(elemento("form-criar").hidden === true); // escondido? então mostra
});

elemento("form-entrar").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    elemento("erro-entrada").textContent = "";
    try {
        guardarSessao(await entrar(campo("entrar-email").value, campo("entrar-senha").value));
        campo("entrar-senha").value = ""; // não deixa a senha no campo
        await iniciar();
    } catch (erro) {
        mostrarErroEntrada(erro);
    }
});

elemento("form-criar").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    elemento("erro-entrada").textContent = "";
    const email = campo("criar-email").value;
    const senha = campo("criar-senha").value;
    try {
        await criarConta(campo("criar-nome").value, email, senha, Number(selecao("criar-setor").value));
        guardarSessao(await entrar(email, senha)); // já entra direto
        (elemento("form-criar") as HTMLFormElement).reset();
        await iniciar();
    } catch (erro) {
        mostrarErroEntrada(erro);
    }
});

elemento("botao-sair").addEventListener("click", () => {
    encerrarSessao();
    lista = []; // nada do usuário anterior fica na memória nem na tela
    limparFiltros(); // o próximo a entrar não herda a busca de quem saiu
    movimentacoes = [];
    desenhar();
    desenharHistorico();
    delete document.body.dataset.perfil; // some tudo que é só do administrador
    (elemento("form-entrar") as HTMLFormElement).reset();
    mostrarFormulario(false); // volta sempre para "Entrar"
    void iniciar();
});

// ---------- Começo do programa ----------
// Mostra a tela de entrada ou o sistema, conforme exista uma sessão
async function iniciar(): Promise<void> {
    const sessao = sessaoAtual();
    elemento("tela-entrada").hidden = sessao !== undefined;
    elemento("tela-app").hidden = sessao === undefined;
    elemento("area-usuario").hidden = sessao === undefined;
    elemento("usuario-nome").textContent = "";
    elemento("usuario-setor").textContent = "";
    elemento("usuario-inicial").textContent = "";
    if (!sessao) return;

    elemento("erro-tabela").textContent = "";
    try {
        // o nome e o perfil vêm da API, não do que está guardado no navegador
        const eu = await buscarEu();
        document.body.dataset.perfil = eu.perfil; // o CSS usa isto para mostrar ou esconder o que é do administrador
        elemento("usuario-nome").textContent = eu.nome;
        elemento("usuario-setor").textContent = eu.perfil === "administrador" ? "Acesso total" : (eu.setorNome ?? "");
        elemento("usuario-inicial").textContent = eu.nome.trim().charAt(0).toUpperCase(); // a bolinha com a inicial
        lista = await listarProdutos();
        desenhar();
        await carregarHistorico();
    } catch (erro) {
        mostrarErroDaTabela(erro);
    }
}

desenhar(); // tela vazia enquanto a API responde
desenharHistorico();
void carregarSetores();
void iniciar();
