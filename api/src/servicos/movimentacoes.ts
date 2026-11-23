// CAMADA DE SERVIÇOS: o log de movimentações.
import * as movimentacoesDados from "../dados/movimentacoes";
import type { Movimentacao, UsuarioLogado } from "../tipos";
import { escopoDe, lerId } from "./produtos";

// O log do setor de quem pergunta (o administrador vê o de todos)
export async function listar(usuario: UsuarioLogado): Promise<Movimentacao[]> {
  return movimentacoesDados.listar(escopoDe(usuario));
}

// O log de um único produto. Produto de outro setor devolve lista vazia, sem revelar nada.
export async function listarDoProduto(usuario: UsuarioLogado, idBruto: string): Promise<Movimentacao[]> {
  return movimentacoesDados.listar(escopoDe(usuario), lerId(idBruto));
}
