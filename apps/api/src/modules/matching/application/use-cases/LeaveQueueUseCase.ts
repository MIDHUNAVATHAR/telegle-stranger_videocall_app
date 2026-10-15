import { MatchmakingService } from '../../infrastructure/services/MatchmakingService';

export class LeaveQueueUseCase {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  public async execute(userId: string): Promise<void> {
    await this.matchmakingService.leaveQueue(userId);
  }
}
