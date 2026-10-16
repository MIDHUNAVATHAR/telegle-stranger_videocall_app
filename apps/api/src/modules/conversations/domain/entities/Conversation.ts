export interface ConversationProps {
  id: string;
  participantIds: [string, string];
  lastCallMatchId?: string;
  lastInteractionAt: Date;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  hiddenByUserIds: string[];
  videoCallEnabledByUserIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Conversation {
  private constructor(private readonly props: ConversationProps) {}

  public static create(
    userAId: string,
    userBId: string,
    lastCallMatchId?: string,
    lastMessageText?: string,
    lastMessageSenderId?: string
  ): Conversation {
    const sortedParticipants: [string, string] = [userAId, userBId].sort() as [string, string];
    const now = new Date();
    return new Conversation({
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      participantIds: sortedParticipants,
      lastCallMatchId,
      lastInteractionAt: now,
      lastMessageText: lastMessageText || '',
      lastMessageSenderId: lastMessageSenderId || '',
      hiddenByUserIds: [],
      videoCallEnabledByUserIds: [],
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

  public get lastMessageText(): string | undefined {
    return this.props.lastMessageText;
  }

  public get lastMessageSenderId(): string | undefined {
    return this.props.lastMessageSenderId;
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

  public get videoCallEnabledByUserIds(): string[] {
    return this.props.videoCallEnabledByUserIds || [];
  }

  public isVideoCallEnabledBy(userId: string): boolean {
    return (this.props.videoCallEnabledByUserIds || []).includes(userId);
  }

  public setVideoCallEnabled(userId: string, enabled: boolean): void {
    if (!this.props.videoCallEnabledByUserIds) {
      this.props.videoCallEnabledByUserIds = [];
    }
    if (enabled) {
      if (!this.props.videoCallEnabledByUserIds.includes(userId)) {
        this.props.videoCallEnabledByUserIds.push(userId);
      }
    } else {
      this.props.videoCallEnabledByUserIds = this.props.videoCallEnabledByUserIds.filter(
        (id) => id !== userId
      );
    }
    this.props.updatedAt = new Date();
  }

  public recordNewCall(
    matchId?: string,
    lastMessageText?: string,
    lastMessageSenderId?: string
  ): void {
    this.props.lastInteractionAt = new Date();
    this.props.updatedAt = new Date();
    if (matchId) {
      this.props.lastCallMatchId = matchId;
    }
    if (lastMessageText !== undefined) {
      this.props.lastMessageText = lastMessageText;
    }
    if (lastMessageSenderId !== undefined) {
      this.props.lastMessageSenderId = lastMessageSenderId;
    }
    // Re-surface in inbox for both participants if previously hidden
    this.props.hiddenByUserIds = [];
  }
}
