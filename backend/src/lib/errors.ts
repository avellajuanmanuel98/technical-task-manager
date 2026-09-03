export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'APP_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(404, message, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tiene permisos para esta acción') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos inválidos', public details?: unknown) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

// Error de conflicto de estado (ej. transición inválida, condición de carrera).
export class ConflictError extends AppError {
  constructor(message = 'La operación no puede realizarse en el estado actual') {
    super(409, message, 'CONFLICT');
  }
}
