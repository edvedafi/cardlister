import Medusa from '@medusajs/medusa-js';

const medusa = new Medusa({
  // publishableApiKey: process.env.MEDUSA_API_KEY,
  apiKey: process.env.MEDUSA_ADMIN_KEY,
});

export async function createCategory(name, parent_category_id, handle, metadata = {}, e) {
  const response = await medusa.admin.productCategories.create({
    name: name,
    handle: handle.toLowerCase().replace(/ /g, '-'),
    is_internal: true,
    is_active: false,
    parent_category_id: parent_category_id,
    metadata,
  });
  return response.product_category;
}

export async function createCategoryActive(name, description, parent_category_id, handle, metadata = {}) {
  const response = await medusa.admin.productCategories.create({
    name: name,
    description: description,
    handle: handle.toLowerCase().replace(/ /g, '-'),
    is_active: true,
    is_internal: false,
    parent_category_id: parent_category_id,
    metadata,
  });
  return response.product_category;
}

export async function setCategoryActive(id, description, metadataUpdates) {
  const response = await medusa.admin.productCategories.update(id, {
    description: description,
    is_active: true,
    is_internal: false,
    metadata: metadataUpdates,
  });
  return response.product_category;
}

export async function updateCategory(id, metadataUpdates) {
  const response = await medusa.admin.productCategories.update(id, { metadata: metadataUpdates });
  return response.product_category;
}

export async function getCategories(parent_category_id) {
  const response = await medusa.admin.productCategories.list({
    parent_category_id: parent_category_id,
    include_descendants_tree: false,
    // fields: 'name',
  });
  return response.product_categories;
}

export async function getCategory(id) {
  const response = await medusa.admin.productCategories.retrieve(id);
  return response.product_category;
}

export async function createProduct(product) {
  const response = await medusa.admin.products.create({
    title: product.title,
    description: product.description,
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height,
    origin_country: product.origin_country,
    material: product.material,
    metadata: product.metadata,
    categories: [{ id: product.categories.id }],
    tags: product.features,
    variants: [
      {
        title: 'base',
        sku: product.metadata.sku,
        manage_inventory: true,
        prices: [{ currency_code: 'usd', amount: 99 }],
      },
    ],
  });
  return response.product;
}

export async function updateProduct(product) {
  const response = await medusa.admin.products.update(product.id, {
    images: product.images,
  });
  return response.product;
}

export async function updateProductVariant(productVariant) {
  // console.log(productVariant);
  const response = await medusa.admin.products.updateVariant(productVariant.product.id, productVariant.id, {
    prices: productVariant.prices,
  });
  return response.product;
}

export async function getProducts(category) {
  const response = await medusa.admin.products.list({
    category_id: [category],
    fields: 'metadata',
  });
  return response.products;
}

export async function getProductVariant(variantId) {
  const response = await medusa.admin.variants.retrieve(variantId);
  return response.variant;
}

export async function getProductCardNumbers(category) {
  const response = await medusa.admin.products.list({
    category_id: [category],
    fields: 'metadata',
  });
  return response.products ? response.products.map((product) => product.metadata.cardNumber) : [];
}

export async function getInventory(productVariant) {
  const response = await medusa.admin.inventoryItems.list({ sku: productVariant.sku });
  let inventoryItem = response.inventory_items?.[0];

  if (!inventoryItem) {
    const createResponse = await medusa.admin.inventoryItems.create({
      variant_id: productVariant.id,
      sku: productVariant.sku,
    });
    inventoryItem = createResponse.inventory_item;
  }

  if (!inventoryItem.location_levels?.find((level) => level.location_id === process.env.MEDUSA_LOCATION_ID)) {
    const levelResponse = await medusa.admin.inventoryItems.createLocationLevel(inventoryItem.id, {
      location_id: process.env.MEDUSA_LOCATION_ID,
      stocked_quantity: 0,
    });
  }

  return inventoryItem;
}

export async function updateInventory(inventoryItem, quantity) {
  const response = await medusa.admin.inventoryItems.updateLocationLevel(
    inventoryItem.id,
    process.env.MEDUSA_LOCATION_ID,
    {
      stocked_quantity: parseInt(quantity),
    },
  );
  return response.inventory_item;
}

let regionCache;

export async function getRegion(regionName) {
  if (!regionCache) {
    const response = await medusa.admin.regions.list();
    regionCache = response.regions.reduce((acc, region) => {
      acc[region.name] = region.id;
      return acc;
    }, {});
  }
  return regionCache[regionName];
}

export async function startSync(categoryId) {
  const response = medusa.admin.batchJobs.create({
    type: 'publish-products',
    context: { categoryId },
    dry_run: true,
  });
}
