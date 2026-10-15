import { Router } from 'express';
import { validateRequest } from '../../../../../common/middleware/validateRequest';
import { authMiddleware } from '../../../../auth';
import { MatchingController } from '../controllers/MatchingController';
import {
  joinQueueSchema,
  getCallSessionSchema,
  endCallSessionSchema,
} from '../validators/MatchingValidators';

export const createMatchingRouter = (controller: MatchingController): Router => {
  const router = Router();

  // Public presence online count
  router.get('/presence', controller.getOnlinePresence);

  // Authenticated matchmaking queue operations
  router.post('/queue/join', authMiddleware, validateRequest(joinQueueSchema), controller.joinQueue);
  router.post('/queue/leave', authMiddleware, controller.leaveQueue);
  router.post('/sessions/:sessionId/accept', authMiddleware, controller.acceptMatch);
  router.post('/sessions/:sessionId/reject', authMiddleware, controller.rejectMatch);
  router.post('/sessions/:sessionId/cancel', authMiddleware, controller.cancelMatch);

  return router;
};

export const createCallsRouter = (controller: MatchingController): Router => {
  const router = Router();

  router.get('/:sessionId', authMiddleware, validateRequest(getCallSessionSchema), controller.getCallSession);
  router.post('/:sessionId/end', authMiddleware, validateRequest(endCallSessionSchema), controller.endCallSession);

  return router;
};
