import { Request, Response, NextFunction } from 'express';
import { RegisterUserUseCase } from '../../../application/use-cases/RegisterUserUseCase';
import { GetUserByIdUseCase } from '../../../application/use-cases/GetUserByIdUseCase';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/UpdateUserProfileUseCase';
import { UserPreferencesUseCase } from '../../../application/use-cases/UserPreferencesUseCase';
import { CloudinaryService } from '../../../infrastructure/services/CloudinaryService';
import { User } from '../../../domain/entities/User';
import { UserRepository } from '../../../domain/repositories/UserRepository';

export class UserController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
    private readonly preferencesUseCase: UserPreferencesUseCase = new UserPreferencesUseCase(),
    private readonly cloudinaryService: CloudinaryService = new CloudinaryService(),
    private readonly userRepository?: UserRepository
  ) {}

  private formatUser(user: User): Record<string, unknown> {
    return {
      _id: user.id,
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.displayName,
      age: user.age,
      gender: user.gender,
      avatar_url: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      is_banned: user.isBanned,
      karmaScore: user.karmaScore,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };
  }

  private formatPublicUser(user: User): Record<string, unknown> {
    return {
      _id: user.id,
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      avatar_url: user.avatarUrl,
      bio: user.bio,
      gender: user.gender,
      age: user.age,
      karmaScore: user.karmaScore,
    };
  }

  public registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.registerUserUseCase.execute(req.body);
      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  public getMyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const user = await this.getUserByIdUseCase.execute(userId);
      const preferences = await this.preferencesUseCase.getPreferences(userId);

      res.status(200).json({
        success: true,
        data: {
          user: this.formatUser(user),
          preferences,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public updateMyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const updatedUser = await this.updateUserProfileUseCase.execute({
        userId,
        username: req.body.username,
        displayName: req.body.display_name || req.body.username,
        bio: req.body.bio,
        gender: req.body.gender,
        age: req.body.age,
        avatarUrl: req.body.avatar_url,
      });

      res.status(200).json({
        success: true,
        data: this.formatUser(updatedUser),
      });
    } catch (error) {
      next(error);
    }
  };

  public signAvatarUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const signaturePayload = this.cloudinaryService.generateUploadSignature(userId);

      res.status(200).json({
        success: true,
        data: signaturePayload,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateMyPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const updatedPreferences = await this.preferencesUseCase.updatePreferences(userId, {
        preferredGender: req.body.preferred_gender,
        allowIncomingCalls: req.body.allow_incoming_calls,
        soundEnabled: req.body.sound_enabled,
      });

      res.status(200).json({
        success: true,
        data: updatedPreferences,
      });
    } catch (error) {
      next(error);
    }
  };

  public getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = await this.getUserByIdUseCase.execute(id);
      res.status(200).json({
        success: true,
        data: this.formatPublicUser(user),
      });
    } catch (error) {
      next(error);
    }
  };

  public searchUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = String(req.query.username || req.query.q || '').trim();
      const currentUserId = req.user?.id;
      if (!query || !this.userRepository) {
        res.status(200).json({
          success: true,
          data: [],
        });
        return;
      }

      const users = await this.userRepository.searchByUsername(query, currentUserId);
      res.status(200).json({
        success: true,
        data: users.map((u) => this.formatPublicUser(u)),
      });
    } catch (error) {
      next(error);
    }
  };
}
