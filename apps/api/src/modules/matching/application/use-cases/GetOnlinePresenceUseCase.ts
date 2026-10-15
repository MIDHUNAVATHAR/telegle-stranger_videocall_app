import { PresenceService } from '../../infrastructure/services/PresenceService';

export class GetOnlinePresenceUseCase {
  constructor(private readonly presenceService: PresenceService) {}

  public async execute(): Promise<number> {
    return this.presenceService.getOnlineCount();
  }
}
