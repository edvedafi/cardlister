import {
  EventBusService,
  ProductVariantInventoryItem,
  ProductVariantService,
  RegionService,
  type SubscriberArgs,
  type SubscriberConfig,
} from '@medusajs/medusa';
import { InventoryLevelService, InventoryService } from '@medusajs/inventory/dist/services';

export default async function inventoryUpdateHandler({
                                                       data, eventName, container, pluginOptions,
                                                     }: SubscriberArgs<Record<string, any>>) {
  console.log('Inventory updated:', data);

  // const productService: ProductService = container.resolve(
  //   'inventoryService',
  // );

  const { id } = data;

  // console.log(container.registrations);
  // Object.keys(container.registrations).forEach((key) => {
  //   if (key.toLowerCase().indexOf('inventory') > -1) {
  //     console.log(key);
  //   }
  // });
  const inventoryService: InventoryService = container.resolve('inventoryService');
  const productVariantInventoryService = container.resolve('productVariantInventoryService');
  const productVariantService: ProductVariantService = container.resolve('productVariantService');
  const regionService: RegionService = container.resolve('regionService');
  const eventBusService: EventBusService = container.resolve('eventBusService');


  // @ts-ignore
  const [levels, count] = await inventoryService.listInventoryLevels({ id });
  console.log('Inventory Level:', levels);
  const inventoryItemId = levels[0].inventory_item_id;
  const quantity = await inventoryService.retrieveAvailableQuantity(inventoryItemId, [levels[0].location_id]);

  const variantInventory = await productVariantInventoryService.listByItem([inventoryItemId]);
  const associatedVariantIds = variantInventory.map((vi: ProductVariantInventoryItem) => vi.variant_id);
  console.log('Variant IDs:', associatedVariantIds);
  const pv = await productVariantService.retrieve(associatedVariantIds[0], { relations: ['prices'] });
  console.log('PV:', pv);

  const regions = await regionService.list();
  const ebayRegion = regions.find(r => r.name === 'ebay');
  const ebayPrice = pv.prices.find(p => p.region_id === ebayRegion.id);
  if (ebayPrice) {
    console.log('Found ebay price: ', ebayPrice);
    await eventBusService.emit('ebay-listing-update', {
      variantId: pv.id,
      price: ebayPrice.amount,
      quantity
    });
  }
}

export const config: SubscriberConfig = {
  event: InventoryLevelService.Events.UPDATED,
  context: {
    subscriberId: 'inventory-update-handler',
  },
};