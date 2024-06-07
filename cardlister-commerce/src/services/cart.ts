import { CartService as MedusaCartService } from '@medusajs/medusa';
import { Lifetime } from 'awilix';


class CartService extends MedusaCartService {
  static LIFE_TIME = Lifetime.SCOPED;

  constructor(container: any) {
    super(container);
  }
}

export default CartService;