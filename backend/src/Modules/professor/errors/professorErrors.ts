export class ProfessorError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends ProfessorError {
  constructor(message: string) { super(message, 400); }
}

export class NotFoundError extends ProfessorError {
  constructor(message = 'Professor não encontrado.') { super(message, 404); }
}

export class ConflictError extends ProfessorError {
  constructor(message: string) { super(message, 409); }
}
