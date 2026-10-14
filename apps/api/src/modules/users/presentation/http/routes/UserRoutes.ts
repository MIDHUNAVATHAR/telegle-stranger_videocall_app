import { Router } from 'express';
import { validateRequest } from '../../../../../common/middleware/validateRequest';
import { UserController } from '../controllers/UserController';
import { createUserSchema, getUserByIdSchema } from '../validators/UserValidators';

export const createUserRouter = (controller: UserController): Router => {
  const router = Router();

  router.post(
    '/',
    validateRequest(createUserSchema),
    controller.registerUser
  );

  router.get(
    '/:id',
    validateRequest(getUserByIdSchema),
    controller.getUserById
  );

  return router;
};
