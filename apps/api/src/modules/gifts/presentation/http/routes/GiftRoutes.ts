import { Router } from 'express';
import { authMiddleware } from '../../../../auth';
import { GiftController } from '../controllers/GiftController';

export const createGiftRouter = (controller: GiftController): Router => {
  const router = Router();

  // Public gift catalog
  router.get('/', controller.listGifts);

  // Authenticated gift sending during 1-on-1 calls
  router.post('/send', authMiddleware, controller.sendGift);

  return router;
};
