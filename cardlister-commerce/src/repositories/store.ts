import { dataSource } from '@medusajs/medusa/dist/loaders/database';
import { StoreRepository as MedusaEntityRepository } from '@medusajs/medusa/dist/repositories/store';
import { Store } from '../models/store';

export const UserRepository = dataSource
  .getRepository(Store)
  .extend({
    ...Object.assign(
      MedusaEntityRepository,
      { target: Store },
    ),
  });

export default UserRepository;