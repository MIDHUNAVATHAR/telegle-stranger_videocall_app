export interface ConversationProps {
  id: string;
  participantIds: [string, string];
  lastCallMatchId?: string;
  lastInteractionAt: Date;
  hiddenByUserIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Conversation {
  private constructor(private readonly props: ConversationProps) {}

  public static create(
    userAId: string,
    userBId: string,
    lastCallMatchId?: string
  ): Conversation {
    const sortedParticipants: [string, string] = [userAId, userBId].sort() as [string, string];
    const now = new Date();
    return new Conversation({
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      participantIds: sortedParticipants,
      lastCallMatchId,
      lastInteractionAt: now,
      hiddenByUserIds: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstruct(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get participantIds(): [string, string] {
    return this.props.participantIds;
  }

  public get lastCallMatchId(): string | undefined {
    return this.props.lastCallMatchId;
  }

  public get lastInteractionAt(): Date {
    return this.props.lastInteractionAt;
  }

  public get hiddenByUserIds(): string[] {
    return this.props.hiddenByUserIds;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public getPartnerId(currentUserId: string): string {
    return this.props.participantIds[0] === currentUserId
      ? this.props.participantIds[1]
      : this.props.participantIds[0];
  }

  public isParticipant(userId: string): boolean {
    return this.props.participantIds.includes(userId);
  }

  public isHiddenFor(userId: string): boolean {
    return this.props.hiddenByUserIds.includes(userId);
  }

  public hideFor(userId: string): void {
    if (!this.props.hiddenByUserIds.includes(userId)) {
      this.props.hiddenByUserIds.push(userId);
      this.props.updatedAt = new Date();
    }
  }

  public recordNewCall(matchId?: string): void {
    this.props.lastInteractionAt = new Date();
    this.props.updatedAt = new Date();
    if (matchId) {
      this.props.lastCallMatchId = matchId;
    }
    // Re-surface in inbox for both participants if previously hidden
    this.props.hiddenByUserIds = [];
  }
}
