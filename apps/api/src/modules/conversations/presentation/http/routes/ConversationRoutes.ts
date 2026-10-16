import { Router } from 'express';
import { authMiddleware } from '../../../../auth';
import { ConversationController } from '../controllers/ConversationController';

export const createConversationRouter = (controller: ConversationController): Router => {
  const router = Router();

  // All conversation inbox routes require authentication
  router.get('/', authMiddleware, controller.listConversations);
  router.post('/', authMiddleware, controller.createOrEnsureConversation);
  router.post('/ensure', authMiddleware, controller.createOrEnsureConversation);
  router.get('/:id', authMiddleware, controller.getConversationById);
  router.delete('/:id', authMiddleware, controller.deleteConversation);
  router.patch('/:id/video-call', authMiddleware, controller.toggleVideoCallPermission);
  router.put('/:id/video-call', authMiddleware, controller.toggleVideoCallPermission);
  router.post('/:id/call', authMiddleware, controller.directCall);

  return router;
};
