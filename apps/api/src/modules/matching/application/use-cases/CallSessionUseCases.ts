import { MatchmakingService } from '../../infrastructure/services/MatchmakingService';
import { CallSessionNotFoundError } from '../../domain/errors/MatchmakingErrors';

export class GetCallSessionUseCase {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  public async execute(sessionId: string): Promise<Record<string, unknown>> {
    const session = await this.matchmakingService.getCallSession(sessionId);
    if (!session) {
      throw new CallSessionNotFoundError(sessionId);
    }
    return session;
  }
}

export class EndCallSessionUseCase {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  public async execute(
    sessionId: string,
    userId: string,
    bypassMinDuration = false
  ): Promise<{ durationSeconds: number; sessionId: string }> {
    return this.matchmakingService.endCallSession(sessionId, userId, bypassMinDuration);
  }
}
