import { ProductService as MedusaProductService } from '@medusajs/medusa';
import { Lifetime } from 'awilix';


class ProductService extends MedusaProductService {
  static LIFE_TIME = Lifetime.SCOPED;

  constructor(container: any) {
    super(container);
  }
}

export default ProductService;