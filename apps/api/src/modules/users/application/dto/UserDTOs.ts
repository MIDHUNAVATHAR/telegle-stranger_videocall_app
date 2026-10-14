export interface CreateUserInputDTO {
  username: string;
  email: string;
  bio?: string;
}

export interface UserResponseDTO {
  id: string;
  username: string;
  email: string;
  bio?: string;
  karmaScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
