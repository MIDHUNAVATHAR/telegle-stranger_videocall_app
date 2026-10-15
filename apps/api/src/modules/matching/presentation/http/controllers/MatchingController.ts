import { Request, Response, NextFunction } from 'express';
import { GetOnlinePresenceUseCase } from '../../../application/use-cases/GetOnlinePresenceUseCase';
import { JoinQueueUseCase } from '../../../application/use-cases/JoinQueueUseCase';
import { LeaveQueueUseCase } from '../../../application/use-cases/LeaveQueueUseCase';
import { GetCallSessionUseCase, EndCallSessionUseCase } from '../../../application/use-cases/CallSessionUseCases';
import { MatchmakingService } from '../../../infrastructure/services/MatchmakingService';

export class MatchingController {
  constructor(
    private readonly getOnlinePresenceUseCase: GetOnlinePresenceUseCase,
    private readonly joinQueueUseCase: JoinQueueUseCase,
    private readonly leaveQueueUseCase: LeaveQueueUseCase,
    private readonly getCallSessionUseCase: GetCallSessionUseCase,
    private readonly endCallSessionUseCase: EndCallSessionUseCase,
    private readonly matchmakingService?: MatchmakingService
  ) {}

  public getOnlinePresence = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const onlineCount = await this.getOnlinePresenceUseCase.execute();
      res.status(200).json({
        success: true,
        data: {
          online_count: onlineCount,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public joinQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const filter = req.body.filter || 'ANY';

      const result = await this.joinQueueUseCase.execute({
        userId,
        filter,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public leaveQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await this.leaveQueueUseCase.execute(userId);

      res.status(200).json({
        success: true,
        data: {
          message: 'Left matchmaking queue successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public getCallSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;
      const session = await this.getCallSessionUseCase.execute(sessionId);

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  };

  public endCallSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;
      const userId = req.user!.id;
      const emergencyReport = req.body?.emergencyReport === true;

      const result = await this.endCallSessionUseCase.execute(sessionId, userId, emergencyReport);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public acceptMatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;
      const userId = req.user!.id;
      const result = await this.matchmakingService?.acceptMatch(sessionId, userId);
      res.status(200).json({
        success: true,
        data: result || { sessionId, status: 'ACCEPTED' },
      });
    } catch (error) {
      next(error);
    }
  };

  public rejectMatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;
      const userId = req.user!.id;
      const result = await this.matchmakingService?.rejectMatch(sessionId, userId);
      res.status(200).json({
        success: true,
        data: result || { sessionId, status: 'REJECTED' },
      });
    } catch (error) {
      next(error);
    }
  };

  public cancelMatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;
      const userId = req.user!.id;
      const result = await this.matchmakingService?.cancelMatch(sessionId, userId);
      res.status(200).json({
        success: true,
        data: result || { sessionId, status: 'CANCELLED' },
      });
    } catch (error) {
      next(error);
    }
  };
}
