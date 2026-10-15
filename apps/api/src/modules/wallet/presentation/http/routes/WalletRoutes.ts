import { Router } from 'express';
import { authMiddleware } from '../../../../auth';
import { WalletController } from '../controllers/WalletController';

export const createWalletRouter = (controller: WalletController): Router => {
  const router = Router();

  // Coin Packages are accessible publicly or authenticated
  router.get('/packages', controller.getPackages);

  // Authenticated Wallet Operations
  router.get('/balance', authMiddleware, controller.getBalance);
  router.post('/orders', authMiddleware, controller.createOrder);
  router.post('/orders/verify', authMiddleware, controller.verifyPayment);
  router.get('/transactions', authMiddleware, controller.listTransactions);

  return router;
};
