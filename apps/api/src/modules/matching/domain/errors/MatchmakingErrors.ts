import { AppError } from '../../../../common/errors/AppError';

export class InsufficientCoinsError extends AppError {
  constructor(message = 'Insufficient coin balance for gender-filtered matchmaking') {
    super(message, 402, 'INSUFFICIENT_COINS');
  }
}

export class AlreadyInQueueError extends AppError {
  constructor(message = 'User is already searching in the matchmaking queue') {
    super(message, 409, 'ALREADY_IN_QUEUE');
  }
}

export class QueueTimeoutError extends AppError {
  constructor(message = 'Matchmaking search timed out. No match found') {
    super(message, 408, 'QUEUE_TIMEOUT');
  }
}

export class MinDurationNotMetError extends AppError {
  constructor(message = 'Call duration must be at least 5 seconds before disconnecting') {
    super(message, 400, 'MIN_DURATION_NOT_MET');
  }
}

export class CallSessionNotFoundError extends AppError {
  constructor(sessionId: string) {
    super(`Call session ${sessionId} not found or expired`, 404, 'CALL_NOT_FOUND');
  }
}
