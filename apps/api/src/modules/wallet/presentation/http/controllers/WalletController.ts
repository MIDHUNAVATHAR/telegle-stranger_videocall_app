import { createOrderSchema, paginationQuerySchema, verifyPaymentSchema } from '@donkey-play/validation';
import { NextFunction, Request, Response } from 'express';
import { WalletUseCases } from '../../../application/use-cases/WalletUseCases';

export class WalletController {
  constructor(private readonly walletUseCases: WalletUseCases) {}

  getBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const balance = await this.walletUseCases.getBalance(userId);
      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (err) {
      next(err);
    }
  };

  getPackages = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const packages = this.walletUseCases.getCoinPackages();
      res.status(200).json({
        success: true,
        data: packages,
      });
    } catch (err) {
      next(err);
    }
  };

  createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const { packageId } = createOrderSchema.parse(req.body);
      const order = await this.walletUseCases.createOrder(userId, packageId);
      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  };

  verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const validated = verifyPaymentSchema.parse(req.body);
      const result = await this.walletUseCases.verifyPayment(userId, validated);
      res.status(200).json({
        success: true,
        data: {
          purchasedCoinsBalance: result.wallet.purchasedCoinsBalance,
          withdrawableEarningsPaise: result.wallet.withdrawableEarningsPaise,
          transaction: result.transaction,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  listTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const { page, limit } = paginationQuerySchema.parse(req.query);
      const result = await this.walletUseCases.listTransactions(userId, page, limit);
      res.status(200).json({
        success: true,
        data: result.transactions,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}
