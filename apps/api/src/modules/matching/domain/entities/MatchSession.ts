export type MatchType = 'RANDOM_FREE' | 'GENDER_FILTER_PAID' | 'DIRECT_INBOX_CALL';
export type MatchStatus = 'SEARCHING' | 'PAIRED' | 'CONNECTED' | 'ENDED';

export interface MatchSessionProps {
  id: string;
  userA: string;
  userB: string;
  matchType: MatchType;
  status: MatchStatus;
  coinCharged: boolean;
  chargedUserId?: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
}

export class MatchSession {
  private constructor(private readonly props: MatchSessionProps) {}

  public static create(
    userA: string,
    userB: string,
    matchType: MatchType = 'RANDOM_FREE',
    chargedUserId?: string
  ): MatchSession {
    return new MatchSession({
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userA,
      userB,
      matchType,
      status: 'PAIRED',
      coinCharged: false,
      chargedUserId,
      startedAt: new Date(),
    });
  }

  public static reconstruct(props: MatchSessionProps): MatchSession {
    return new MatchSession(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get userA(): string {
    return this.props.userA;
  }

  public get userB(): string {
    return this.props.userB;
  }

  public get matchType(): MatchType {
    return this.props.matchType;
  }

  public get status(): MatchStatus {
    return this.props.status;
  }

  public get coinCharged(): boolean {
    return this.props.coinCharged;
  }

  public get chargedUserId(): string | undefined {
    return this.props.chargedUserId;
  }

  public get startedAt(): Date {
    return this.props.startedAt;
  }

  public get endedAt(): Date | undefined {
    return this.props.endedAt;
  }

  public get durationSeconds(): number | undefined {
    return this.props.durationSeconds;
  }

  public markConnected(): void {
    this.props.status = 'CONNECTED';
  }

  public markCoinDebited(): void {
    this.props.coinCharged = true;
  }

  public endSession(): void {
    this.props.status = 'ENDED';
    this.props.endedAt = new Date();
    this.props.durationSeconds = Math.max(
      0,
      Math.floor((this.props.endedAt.getTime() - this.props.startedAt.getTime()) / 1000)
    );
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      sessionId: this.id,
      userA: this.userA,
      userB: this.userB,
      matchType: this.matchType,
      status: this.status,
      coinCharged: this.coinCharged ? '1' : '0',
      chargedUserId: this.chargedUserId || '',
      startedAt: this.startedAt.toISOString(),
      endedAt: this.endedAt?.toISOString() || null,
      durationSeconds: this.durationSeconds || 0,
    };
  }
}
