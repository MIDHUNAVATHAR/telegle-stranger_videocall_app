import { blockUserSchema, createReportSchema } from '@donkey-play/validation';
import { NextFunction, Request, Response } from 'express';
import { ModerationUseCases } from '../../../application/use-cases/ModerationUseCases';

export class ModerationController {
  constructor(private readonly moderationUseCases: ModerationUseCases) {}

  reportUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reporterId = req.user?.id || '';
      const validated = createReportSchema.parse(req.body);

      const result = await this.moderationUseCases.reportUser({
        reporterId,
        targetUserId: validated.targetUserId,
        matchSessionId: validated.matchSessionId,
        reason: validated.reason,
        details: validated.details,
      });

      res.status(201).json({
        success: true,
        data: {
          reportId: result.report.id,
          actionTaken: result.report.actionTaken,
          autoBanned: result.autoBanned,
          createdAt: result.report.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  blockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const { targetUserId } = blockUserSchema.parse(req.body);

      const block = await this.moderationUseCases.blockUser(userId, targetUserId);
      res.status(201).json({
        success: true,
        data: block,
      });
    } catch (err) {
      next(err);
    }
  };

  unblockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const targetUserId = Array.isArray(req.params.targetUserId)
        ? req.params.targetUserId[0]
        : (req.params.targetUserId as string);

      await this.moderationUseCases.unblockUser(userId, targetUserId);
      res.status(200).json({
        success: true,
        data: { unblocked: true },
      });
    } catch (err) {
      next(err);
    }
  };

  listBlocks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const blocks = await this.moderationUseCases.listBlocks(userId);

      res.status(200).json({
        success: true,
        data: blocks,
      });
    } catch (err) {
      next(err);
    }
  };

  checkBlockStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const targetUserId = Array.isArray(req.params.targetUserId)
        ? req.params.targetUserId[0]
        : (req.params.targetUserId as string);

      const status = await this.moderationUseCases.checkBlockStatus(userId, targetUserId);
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  };
}
