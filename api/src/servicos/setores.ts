// CAMADA DE SERVIÇOS: setores.
import * as setoresDados from "../dados/setores";
import type { Setor } from "../tipos";

export async function listar(): Promise<Setor[]> {
  return setoresDados.listar();
}
