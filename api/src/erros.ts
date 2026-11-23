// Um erro que já sabe qual código HTTP deve virar.
// Os serviços lançam (throw new ErroHttp(404, "...")) e um único middleware
// em servidor.ts transforma em resposta: as rotas não repetem res.status(...).json(...).
export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroHttp";
  }
}
