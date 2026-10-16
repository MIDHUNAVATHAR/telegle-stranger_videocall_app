import { Request, Response, NextFunction } from 'express';
import {
  ListConversationsUseCase,
  GetConversationByIdUseCase,
  DeleteConversationUseCase,
  DirectCallUseCase,
  ToggleVideoCallPermissionUseCase,
  RecordCallConnectionUseCase,
} from '../../../application/use-cases/ConversationUseCases';

export class ConversationController {
  constructor(
    private readonly listConversationsUseCase: ListConversationsUseCase,
    private readonly getConversationByIdUseCase: GetConversationByIdUseCase,
    private readonly deleteConversationUseCase: DeleteConversationUseCase,
    private readonly directCallUseCase: DirectCallUseCase,
    private readonly toggleVideoCallPermissionUseCase: ToggleVideoCallPermissionUseCase,
    private readonly recordCallConnectionUseCase?: RecordCallConnectionUseCase
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

  public toggleVideoCallPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { enabled } = req.body;

      const result = await this.toggleVideoCallPermissionUseCase.execute(
        conversationId,
        userId,
        typeof enabled === 'boolean' ? enabled : true
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public createOrEnsureConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const partnerId = req.body.partnerId || req.body.partner_id;
      const matchId = req.body.matchId || req.body.match_id;
      const lastMessageText = req.body.lastMessageText || req.body.last_message_text || req.body.text || '';

      if (!partnerId) {
        res.status(400).json({
          success: false,
          message: 'partnerId is required',
        });
        return;
      }

      if (!this.recordCallConnectionUseCase) {
        res.status(500).json({
          success: false,
          message: 'recordCallConnectionUseCase not configured',
        });
        return;
      }

      const conv = await this.recordCallConnectionUseCase.execute(
        userId,
        partnerId,
        matchId,
        lastMessageText,
        userId
      );
      res.status(200).json({
        success: true,
        data: {
          id: conv.id,
          _id: conv.id,
          participantIds: conv.participantIds,
          last_interaction_at: conv.lastInteractionAt.toISOString(),
          last_message_text: conv.lastMessageText || '',
          last_message_sender_id: conv.lastMessageSenderId || '',
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
