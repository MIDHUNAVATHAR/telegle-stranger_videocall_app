import { ValidationError } from '../../../../common/errors/AppError';

export interface UserProps {
  id: string;
  username: string;
  email: string;
  bio?: string;
  karmaScore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  id?: string;
  username: string;
  email: string;
  bio?: string;
}

export class User {
  private props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

  public static create(props: CreateUserProps): User {
    const trimmedUsername = props.username.trim();
    const normalizedEmail = props.email.trim().toLowerCase();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      throw new ValidationError('Username must be between 3 and 30 characters');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new ValidationError('Invalid email format');
    }

    const now = new Date();
    return new User({
      id: props.id ?? crypto.randomUUID(),
      username: trimmedUsername,
      email: normalizedEmail,
      bio: props.bio?.trim() ?? '',
      karmaScore: 100,
      isActive: true,
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

  public get email(): string {
    return this.props.email;
  }

  public get bio(): string | undefined {
    return this.props.bio;
  }

  public get karmaScore(): number {
    return this.props.karmaScore;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updateBio(newBio: string): void {
    if (newBio.length > 500) {
      throw new ValidationError('Bio cannot exceed 500 characters');
    }
    this.props.bio = newBio.trim();
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
