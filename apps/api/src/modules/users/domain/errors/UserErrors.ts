import { ConflictError, NotFoundError } from '../../../../common/errors/AppError';

export class UserNotFoundError extends NotFoundError {
  constructor(userId: string) {
    super(`User with ID '${userId}' was not found`);
  }
}

export class UserAlreadyExistsError extends ConflictError {
  constructor(identifier: string) {
    super(`User with email or username '${identifier}' already exists`);
  }
}
