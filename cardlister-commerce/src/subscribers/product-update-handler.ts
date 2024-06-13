import { ProductService, ProductVariantService, type SubscriberArgs, type SubscriberConfig } from '@medusajs/medusa';

export default async function productUpdateHandler({
                                                     data, eventName, container, pluginOptions,
                                                   }: SubscriberArgs<Record<string, any>>) {
  console.log('Product updated:', data);
  const productService: ProductService = container.resolve(
    'productVariantService',
  );

  const { id } = data;
  console.log(`PV ${eventName}`, data);

  const product = await productService.retrieve(id);

  console.log('Full Variant:', data);

  // do something with the product...
}

export const config: SubscriberConfig = {
  event: ProductVariantService.Events.UPDATED,
  context: {
    subscriberId: 'product-update-handler',
  },
};