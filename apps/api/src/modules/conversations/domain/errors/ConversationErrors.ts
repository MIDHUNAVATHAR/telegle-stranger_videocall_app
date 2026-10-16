import { AppError } from '../../../../common/errors/AppError';

export class ConversationNotFoundError extends AppError {
  constructor(id: string) {
    super(`Conversation ${id} not found`, 404, 'CONVERSATION_NOT_FOUND');
  }
}

export class DirectCallNotAllowedError extends AppError {
  constructor(message = 'Partner is not accepting direct incoming calls') {
    super(message, 403, 'DIRECT_CALL_NOT_ALLOWED');
  }
}

export class UserAlreadyInCallError extends AppError {
  constructor(message = 'User is already in another video call') {
    super(message, 409, 'USER_BUSY');
  }
}
