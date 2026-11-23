// CAMADA DE SERVIÇOS: as regras do negócio. Valida, decide e controla a transação.
// Não conhece HTTP (req/res) nem escreve SQL: quando algo está errado, lança ErroHttp.
import { emTransacao } from "../banco";
import * as movimentacoesDados from "../dados/movimentacoes";
import * as produtosDados from "../dados/produtos";
import * as setoresDados from "../dados/setores";
import { ErroHttp } from "../erros";
import {
  CATEGORIAS,
  SITUACOES,
  type DadosProduto,
  type FiltrosProduto,
  type Produto,
  type UsuarioLogado,
} from "../tipos";

// O administrador enxerga tudo (null); os demais, só o setor deles.
export function escopoDe(usuario: UsuarioLogado): number | null {
  return usuario.perfil === "administrador" ? null : usuario.setorId;
}

function naoEncontrado(idBruto: string): ErroHttp {
  return new ErroHttp(404, `Produto #${idBruto} não encontrado.`);
}

// O id chega da URL como texto. Se não for um inteiro, o produto simplesmente não existe.
export function lerId(idBruto: string): number {
  const id = Number(idBruto);
  if (!Number.isInteger(id)) throw naoEncontrado(idBruto);
  return id;
}

function inteiroNaoNegativo(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0;
}

function ehUmDe<T extends string>(opcoes: readonly T[], valor: string): valor is T {
  return (opcoes as readonly string[]).includes(valor);
}

// Devolve a mensagem de erro, ou undefined se estiver tudo certo
function validar(dados: DadosProduto): string | undefined {
  if (typeof dados.nome !== "string" || dados.nome.trim().length < 3) {
    return "O nome precisa ter pelo menos 3 caracteres.";
  }
  if (dados.categoria === undefined || !CATEGORIAS.includes(dados.categoria)) {
    return "Categoria inválida.";
  }
  if (!inteiroNaoNegativo(dados.quantidade)) {
    return "A quantidade deve ser um número inteiro maior ou igual a zero.";
  }
  if (!inteiroNaoNegativo(dados.estoqueMinimo)) {
    return "O estoque mínimo deve ser um número inteiro maior ou igual a zero.";
  }
  if (typeof dados.preco !== "number" || !(dados.preco > 0)) {
    return "O preço deve ser maior que zero.";
  }
  return undefined;
}

// Confere a query string (?situacao=baixo&busca=feij...). O que não veio fica de fora;
// o que veio errado é recusado com 400 em vez de ser ignorado em silêncio.
function lerFiltros(consulta: Record<string, unknown>): FiltrosProduto {
  const texto = (chave: string): string => {
    const valor = consulta[chave];
    return typeof valor === "string" ? valor.trim() : "";
  };
  const filtros: FiltrosProduto = {};

  const situacao = texto("situacao");
  if (situacao !== "") {
    if (!ehUmDe(SITUACOES, situacao)) throw new ErroHttp(400, "Situação inválida.");
    filtros.situacao = situacao;
  }
  const categoria = texto("categoria");
  if (categoria !== "") {
    if (!ehUmDe(CATEGORIAS, categoria)) throw new ErroHttp(400, "Categoria inválida.");
    filtros.categoria = categoria;
  }
  const setor = texto("setorId");
  if (setor !== "") {
    const setorId = Number(setor);
    if (!Number.isInteger(setorId)) throw new ErroHttp(400, "Setor inválido.");
    filtros.setorId = setorId;
  }
  const busca = texto("busca");
  if (busca !== "") {
    filtros.busca = busca.slice(0, 100);
  }
  return filtros;
}

export async function listar(usuario: UsuarioLogado, consulta: Record<string, unknown>): Promise<Produto[]> {
  return produtosDados.listar(escopoDe(usuario), lerFiltros(consulta));
}

export async function obter(usuario: UsuarioLogado, idBruto: string): Promise<Produto> {
  const produto = await produtosDados.buscarPorId(lerId(idBruto), escopoDe(usuario));
  if (!produto) throw naoEncontrado(idBruto);
  return produto;
}

export async function cadastrar(usuario: UsuarioLogado, dados: DadosProduto): Promise<Produto> {
  const problema = validar(dados);
  if (problema) throw new ErroHttp(400, problema);

  // Quem decide o setor: o administrador escolhe; os demais SEMPRE usam o próprio
  // setor, mesmo que o navegador mande outro número.
  let setorId: number;
  if (usuario.perfil === "administrador") {
    if (typeof dados.setorId !== "number" || !(await setoresDados.existe(dados.setorId))) {
      throw new ErroHttp(400, "Escolha o setor responsável pelo produto.");
    }
    setorId = dados.setorId;
  } else {
    setorId = usuario.setorId!;
  }

  const nome = dados.nome!.trim();
  const quantidade = dados.quantidade!;
  const id = await emTransacao(async (conexao) => {
    const novoId = await produtosDados.inserir(conexao, {
      nome,
      descricao: dados.descricao ?? null,
      categoria: dados.categoria!,
      setorId,
      quantidade,
      estoqueMinimo: dados.estoqueMinimo!,
      preco: dados.preco!,
    });
    await movimentacoesDados.registrar(conexao, {
      produtoId: novoId,
      produtoNome: nome,
      setorId,
      tipo: "cadastro",
      quantidade,
      saldo: quantidade,
    });
    return novoId;
  });

  const criado = await produtosDados.buscarPorId(id, escopoDe(usuario));
  if (!criado) throw new Error("O produto recém-criado não foi encontrado.");
  return criado;
}

// Só a quantidade muda aqui: é a entrada e a saída de estoque
export async function alterarQuantidade(
  usuario: UsuarioLogado,
  idBruto: string,
  quantidadeBruta: unknown,
): Promise<void> {
  if (!inteiroNaoNegativo(quantidadeBruta)) {
    throw new ErroHttp(400, "A quantidade deve ser um número inteiro maior ou igual a zero.");
  }
  const quantidade: number = quantidadeBruta;
  const id = lerId(idBruto);

  await emTransacao(async (conexao) => {
    const produto = await produtosDados.travarPorId(conexao, id, escopoDe(usuario));
    if (!produto) throw naoEncontrado(idBruto); // lançar aqui desfaz a transação
    await produtosDados.atualizarQuantidade(conexao, id, quantidade);
    if (quantidade !== produto.quantidade) {
      await movimentacoesDados.registrar(conexao, {
        produtoId: id,
        produtoNome: produto.nome,
        setorId: produto.setorId,
        tipo: quantidade > produto.quantidade ? "entrada" : "saida",
        quantidade: Math.abs(quantidade - produto.quantidade),
        saldo: quantidade,
      });
    }
  });
}

export async function excluir(usuario: UsuarioLogado, idBruto: string): Promise<void> {
  const id = lerId(idBruto);
  await emTransacao(async (conexao) => {
    const produto = await produtosDados.travarPorId(conexao, id, escopoDe(usuario));
    if (!produto) throw naoEncontrado(idBruto);
    // registra ANTES de apagar: depois o produto não existe mais
    await movimentacoesDados.registrar(conexao, {
      produtoId: id,
      produtoNome: produto.nome,
      setorId: produto.setorId,
      tipo: "exclusao",
      quantidade: produto.quantidade,
      saldo: 0,
    });
    await produtosDados.excluir(conexao, id);
  });
}
