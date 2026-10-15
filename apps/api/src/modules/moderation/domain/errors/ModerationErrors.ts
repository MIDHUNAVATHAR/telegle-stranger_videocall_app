import { AppError } from '../../../../common/errors/AppError';

export class ModerationError extends AppError {
  constructor(message: string, statusCode: number = 400, code: string = 'MODERATION_ERROR') {
    super(message, statusCode, code);
    this.name = 'ModerationError';
  }
}

export class CannotReportSelfError extends ModerationError {
  constructor() {
    super('You cannot report yourself', 400, 'CANNOT_REPORT_SELF');
    this.name = 'CannotReportSelfError';
  }
}

export class CannotBlockSelfError extends ModerationError {
  constructor() {
    super('You cannot block yourself', 400, 'CANNOT_BLOCK_SELF');
    this.name = 'CannotBlockSelfError';
  }
}

export class BlockNotFoundError extends ModerationError {
  constructor() {
    super('Block relationship not found', 404, 'BLOCK_NOT_FOUND');
    this.name = 'BlockNotFoundError';
  }
}
