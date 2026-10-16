import { Router } from 'express';
import { authMiddleware } from '../../../../auth';
import { ModerationController } from '../controllers/ModerationController';

export const createModerationRouter = (controller: ModerationController): Router => {
  const router = Router();

  // All moderation endpoints require authenticated user session
  router.post('/reports', authMiddleware, controller.reportUser);
  router.post('/blocks', authMiddleware, controller.blockUser);
  router.delete('/blocks/:targetUserId', authMiddleware, controller.unblockUser);
  router.get('/blocks', authMiddleware, controller.listBlocks);
  router.get('/status/:targetUserId', authMiddleware, controller.checkBlockStatus);

  return router;
};
