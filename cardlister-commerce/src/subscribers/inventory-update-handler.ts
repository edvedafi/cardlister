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
  data,
  eventName,
  container,
  pluginOptions,
}: SubscriberArgs<Record<string, any>>) {
  try {
    const { id } = data;

    const inventoryService: InventoryService = container.resolve('inventoryService');
    const productVariantInventoryService = container.resolve('productVariantInventoryService');
    const productVariantService: ProductVariantService = container.resolve('productVariantService');
    const regionService: RegionService = container.resolve('regionService');
    const eventBusService: EventBusService = container.resolve('eventBusService');

    // @ts-ignore
    const [levels, count] = await inventoryService.listInventoryLevels({ id });
    const inventoryItemId = levels[0].inventory_item_id;
    const quantity = await inventoryService.retrieveAvailableQuantity(inventoryItemId, [levels[0].location_id]);

    const variantInventory = await productVariantInventoryService.listByItem([inventoryItemId]);
    const associatedVariantIds = variantInventory.map((vi: ProductVariantInventoryItem) => vi.variant_id);
    const pv = await productVariantService.retrieve(associatedVariantIds[0], { relations: ['prices'] });

    const regions = await regionService.list();
    const ebayRegion = regions.find((r) => r.name === 'ebay');
    const mcpRegion = regions.find((r) => r.name === 'MCP');
    const ebayPrice = pv.prices.find((p) => p.region_id === ebayRegion.id);
    const mcpPrice = pv.prices.find((p) => p.region_id === mcpRegion.id);

    if (ebayPrice) {
      await eventBusService.emit('ebay-listing-update', {
        variantId: pv.id,
        price: ebayPrice.amount,
        quantity,
      });
    }

    if (mcpPrice) {
      await eventBusService.emit('mcp-listing-update', {
        variantId: pv.id,
        price: mcpPrice.amount,
        quantity,
      });
    }
    console.log('inventoryUpdateHandler::Complete');
  } catch (error) {
    console.error('inventoryUpdateHandler::error: ', error);
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: InventoryLevelService.Events.UPDATED,
  context: {
    subscriberId: 'inventory-update-handler',
  },
};
