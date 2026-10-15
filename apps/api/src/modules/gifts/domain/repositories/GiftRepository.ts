import { IGiftEntity, IGiftTransferEntity } from '../entities/Gift';

export interface IGiftRepository {
  listActiveGifts(): Promise<IGiftEntity[]>;
  findBySlug(slug: string): Promise<IGiftEntity | null>;
  recordTransfer(
    transfer: Omit<IGiftTransferEntity, 'id' | 'createdAt'>
  ): Promise<IGiftTransferEntity>;
}
