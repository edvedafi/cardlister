import { ProductService as MedusaProductService } from '@medusajs/medusa';
import { Lifetime } from 'awilix';
import { CreateProductInput, UpdateProductInput } from '@medusajs/medusa/dist/types/product';
import { Product } from '@medusajs/medusa/dist/models';


class ProductService extends MedusaProductService {
  static LIFE_TIME = Lifetime.SCOPED;

  constructor(container: any) {
    super(container);
  }

  async create(productObject: CreateProductInput): Promise<Product> {
    return super.create(productObject);
  }

  async update(productId: string, update: UpdateProductInput): Promise<Product> {
    return super.update(productId, update);
  }
}

export default ProductService;