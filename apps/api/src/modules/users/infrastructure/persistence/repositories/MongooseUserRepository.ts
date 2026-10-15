import { Model } from 'mongoose';
import { User } from '../../../domain/entities/User';
import { UserRepository } from '../../../domain/repositories/UserRepository';
import { UserDocument, UserModel } from '../mongoose/UserModel';
import { UserMapper } from '../../mappers/UserMapper';

export class MongooseUserRepository implements UserRepository {
  constructor(private readonly model: Model<UserDocument> = UserModel) {}

  public async findById(id: string): Promise<User | null> {
    const doc = await this.model.findOne({ userId: id }).exec();
    if (!doc) {
      return null;
    }
    return UserMapper.toDomain(doc);
  }

  public async findByEmail(email: string): Promise<User | null> {
    const doc = await this.model.findOne({ email: email.toLowerCase() }).exec();
    if (!doc) {
      return null;
    }
    return UserMapper.toDomain(doc);
  }

  public async findByUsername(username: string): Promise<User | null> {
    const doc = await this.model.findOne({ username }).exec();
    if (!doc) {
      return null;
    }
    return UserMapper.toDomain(doc);
  }

  public async findByGoogleId(googleId: string): Promise<User | null> {
    const doc = await this.model.findOne({ googleId }).exec();
    if (!doc) {
      return null;
    }
    return UserMapper.toDomain(doc);
  }

  public async existsByEmail(email: string): Promise<boolean> {
    const count = await this.model.countDocuments({ email: email.toLowerCase() }).exec();
    return count > 0;
  }

  public async existsByUsername(username: string): Promise<boolean> {
    const count = await this.model.countDocuments({ username }).exec();
    return count > 0;
  }

  public async save(user: User): Promise<User> {
    const persistenceData = UserMapper.toPersistence(user);
    const updatedDoc = await this.model
      .findOneAndUpdate(
        { userId: user.id },
        { $set: persistenceData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      .exec();

    return UserMapper.toDomain(updatedDoc);
  }
}
