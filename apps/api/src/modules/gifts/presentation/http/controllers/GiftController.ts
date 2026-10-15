import { sendGiftSchema } from '@donkey-play/validation';
import { NextFunction, Request, Response } from 'express';
import { GiftUseCases } from '../../../application/use-cases/GiftUseCases';

export class GiftController {
  constructor(private readonly giftUseCases: GiftUseCases) {}

  listGifts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gifts = await this.giftUseCases.listGifts();
      res.status(200).json({
        success: true,
        data: gifts,
      });
    } catch (err) {
      next(err);
    }
  };

  sendGift = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const senderId = req.user?.id || '';
      const { giftSlug, recipientUserId, matchSessionId } = sendGiftSchema.parse(req.body);

      const result = await this.giftUseCases.sendGift(
        senderId,
        recipientUserId,
        giftSlug,
        matchSessionId
      );

      res.status(200).json({
        success: true,
        data: {
          transferId: result.transfer.id,
          gift: result.gift,
          remainingCoins: result.remainingCoins,
          sentAt: result.transfer.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}
