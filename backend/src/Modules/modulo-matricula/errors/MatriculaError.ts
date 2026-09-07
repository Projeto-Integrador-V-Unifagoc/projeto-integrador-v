export class MatriculaError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = "MatriculaError";
    }

    static dadosInvalidos(message: string) {
        return new MatriculaError(400, message);
    }

    static naoEncontrado(message: string) {
        return new MatriculaError(404, message);
    }

    static conflito(message: string) {
        return new MatriculaError(409, message);
    }
}
