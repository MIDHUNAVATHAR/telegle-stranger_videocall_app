import { Request, Response, NextFunction } from 'express';
import {
  ListConversationsUseCase,
  GetConversationByIdUseCase,
  DeleteConversationUseCase,
  DirectCallUseCase,
} from '../../../application/use-cases/ConversationUseCases';

export class ConversationController {
  constructor(
    private readonly listConversationsUseCase: ListConversationsUseCase,
    private readonly getConversationByIdUseCase: GetConversationByIdUseCase,
    private readonly deleteConversationUseCase: DeleteConversationUseCase,
    private readonly directCallUseCase: DirectCallUseCase
  ) {}

  public listConversations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await this.listConversationsUseCase.execute(userId, page, limit);

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  public getConversationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const result = await this.getConversationByIdUseCase.execute(conversationId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      await this.deleteConversationUseCase.execute(conversationId, userId);

      res.status(200).json({
        success: true,
        message: 'Conversation removed from inbox',
      });
    } catch (error) {
      next(error);
    }
  };

  public directCall = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const result = await this.directCallUseCase.execute(conversationId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
