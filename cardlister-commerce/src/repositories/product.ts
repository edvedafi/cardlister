import { Product } from '../models/product';
import { dataSource } from '@medusajs/medusa/dist/loaders/database';
import { ProductRepository as MedusaEntityRepository } from '@medusajs/medusa/dist/repositories/product';

export const ProductRepository = dataSource
  .getRepository(Product)
  .extend(
    Object.assign(
      MedusaEntityRepository,
      { target: Product },
    ),
  );

export default ProductRepository;