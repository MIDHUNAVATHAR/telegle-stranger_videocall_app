import { ValidationError } from '../../../../common/errors/AppError';

export type UserGender = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';

export interface UserProps {
  id: string;
  username: string;
  displayName: string;
  email: string;
  googleId?: string;
  age: number;
  gender: UserGender;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  isBanned: boolean;
  bannedUntil?: Date | null;
  karmaScore: number;
  isActive: boolean;
  tokenVersion: number;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  id?: string;
  username?: string;
  displayName?: string;
  email: string;
  googleId?: string;
  age?: number;
  gender?: UserGender;
  avatarUrl?: string;
  bio?: string;
  role?: UserRole;
}

export class User {
  private props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

  public static create(props: CreateUserProps): User {
    const normalizedEmail = props.email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new ValidationError('Invalid email format');
    }

    const defaultUsername = props.username?.trim() || `player_${Math.floor(1000 + Math.random() * 9000)}`;
    const displayName = props.displayName?.trim() || defaultUsername;

    if (defaultUsername.length < 3 || defaultUsername.length > 30) {
      throw new ValidationError('Username must be between 3 and 30 characters');
    }

    const age = props.age ?? 18;
    if (age < 18) {
      throw new ValidationError('You must be at least 18 years old to use Donkey Play');
    }

    const now = new Date();
    return new User({
      id: props.id ?? crypto.randomUUID(),
      username: defaultUsername,
      displayName,
      email: normalizedEmail,
      googleId: props.googleId,
      age,
      gender: props.gender ?? 'PREFER_NOT_TO_SAY',
      avatarUrl: props.avatarUrl ?? '',
      bio: props.bio?.trim() ?? '',
      role: props.role ?? 'USER',
      isBanned: false,
      bannedUntil: null,
      karmaScore: 100,
      isActive: true,
      tokenVersion: 1,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(props: UserProps): User {
    return new User(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get username(): string {
    return this.props.username;
  }

  public get displayName(): string {
    return this.props.displayName;
  }

  public get email(): string {
    return this.props.email;
  }

  public get googleId(): string | undefined {
    return this.props.googleId;
  }

  public get age(): number {
    return this.props.age;
  }

  public get gender(): UserGender {
    return this.props.gender;
  }

  public get avatarUrl(): string | undefined {
    return this.props.avatarUrl;
  }

  public get bio(): string | undefined {
    return this.props.bio;
  }

  public get role(): UserRole {
    return this.props.role;
  }

  public get isBanned(): boolean {
    if (!this.props.isBanned) return false;
    if (this.props.bannedUntil && new Date() > this.props.bannedUntil) {
      return false;
    }
    return true;
  }

  public get bannedUntil(): Date | null | undefined {
    return this.props.bannedUntil;
  }

  public get karmaScore(): number {
    return this.props.karmaScore;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get tokenVersion(): number {
    return this.props.tokenVersion;
  }

  public get lastLoginAt(): Date {
    return this.props.lastLoginAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updateProfile(params: {
    displayName?: string;
    bio?: string;
    gender?: UserGender;
    avatarUrl?: string;
    age?: number;
  }): void {
    if (params.displayName) {
      const trimmed = params.displayName.trim();
      if (trimmed.length < 2 || trimmed.length > 30) {
        throw new ValidationError('Display name must be between 2 and 30 characters');
      }
      this.props.displayName = trimmed;
    }
    if (params.bio !== undefined) {
      if (params.bio.length > 200) {
        throw new ValidationError('Bio cannot exceed 200 characters');
      }
      this.props.bio = params.bio.trim();
    }
    if (params.gender) {
      this.props.gender = params.gender;
    }
    if (params.avatarUrl !== undefined) {
      this.props.avatarUrl = params.avatarUrl;
    }
    if (params.age !== undefined) {
      if (params.age < 18) {
        throw new ValidationError('Must be at least 18 years of age');
      }
      this.props.age = params.age;
    }
    this.props.updatedAt = new Date();
  }

  public updateBio(newBio: string): void {
    if (newBio.length > 500) {
      throw new ValidationError('Bio cannot exceed 500 characters');
    }
    this.props.bio = newBio.trim();
    this.props.updatedAt = new Date();
  }

  public recordLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();
  }

  public applyBan(durationSeconds: number): void {
    this.props.isBanned = true;
    this.props.bannedUntil = new Date(Date.now() + durationSeconds * 1000);
    this.props.tokenVersion += 1;
    this.props.updatedAt = new Date();
  }

  public liftBan(): void {
    this.props.isBanned = false;
    this.props.bannedUntil = null;
    this.props.updatedAt = new Date();
  }

  public adjustKarma(delta: number): void {
    this.props.karmaScore = Math.max(0, this.props.karmaScore + delta);
    this.props.updatedAt = new Date();
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }
}
