// Custom Error Types
export interface IErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  details?: any;
}

export class ApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(400, message, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(409, message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(500, message);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
