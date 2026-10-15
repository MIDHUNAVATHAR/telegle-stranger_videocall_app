import { AppError } from '../../../../common/errors/AppError';

export class GiftError extends AppError {
  constructor(message: string, statusCode: number = 400, code: string = 'GIFT_ERROR') {
    super(message, statusCode, code);
    this.name = 'GiftError';
  }
}

export class GiftNotFoundError extends GiftError {
  constructor(identifier: string) {
    super(`Gift not found: ${identifier}`, 404, 'GIFT_NOT_FOUND');
    this.name = 'GiftNotFoundError';
  }
}

export class CannotGiftSelfError extends GiftError {
  constructor() {
    super('You cannot send a virtual gift to yourself', 400, 'CANNOT_GIFT_SELF');
    this.name = 'CannotGiftSelfError';
  }
}
