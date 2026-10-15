import { Router } from 'express';
import { authMiddleware } from '../../../../auth';
import { ConversationController } from '../controllers/ConversationController';

export const createConversationRouter = (controller: ConversationController): Router => {
  const router = Router();

  // All conversation inbox routes require authentication
  router.get('/', authMiddleware, controller.listConversations);
  router.get('/:id', authMiddleware, controller.getConversationById);
  router.delete('/:id', authMiddleware, controller.deleteConversation);
  router.post('/:id/call', authMiddleware, controller.directCall);

  return router;
};
