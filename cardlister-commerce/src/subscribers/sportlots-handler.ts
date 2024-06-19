import {
  Product,
  ProductService,
  ProductVariantService,
  type SubscriberArgs,
  type SubscriberConfig,
} from '@medusajs/medusa';

export default async function sportlotsHandler({
                                                 data, eventName, container, pluginOptions,
                                               }: SubscriberArgs<Record<string, any>>) {
  try {
    console.log('ebay::Update Handler: ', data);

    const { variantId, price, quantity } = data;

    const productVariantService: ProductVariantService = container.resolve('productVariantService');
    const productService: ProductService = container.resolve('productService');

    const productVariant = await productVariantService.retrieve(variantId);
    const product: Product = await productService.retrieve(productVariant.product_id, { relations: ['categories', 'images'] });
    const category = product.categories[0];

    // console.log('ebay::productVariant: ', productVariant);
    // console.log('ebay::product: ', product);
    // console.log('ebay::category: ', category);

  } catch (error) {
    console.error('ebayHandler::error: ', error);
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: 'sportlots-update',
  context: {
    subscriberId: 'sportlots-handler',
  },
};