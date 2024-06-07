import { User } from '../models/user';
import { dataSource } from '@medusajs/medusa/dist/loaders/database';
import { UserRepository as MedusaEntityRepository } from '@medusajs/medusa/dist/repositories/user';

export const UserRepository = dataSource
  .getRepository(User)
  .extend({
    ...Object.assign(
      MedusaEntityRepository,
      { target: User },
    ),
  });

export default UserRepository;