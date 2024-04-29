import Medusa from '@medusajs/medusa-js';

const medusa = new Medusa({
  // publishableApiKey: process.env.MEDUSA_API_KEY,
  apiKey: process.env.MEDUSA_ADMIN_KEY,
});

export async function createCategory(name, parent_category_id, handle, metadata = {}, isActive = true) {
  const response = await medusa.admin.productCategories.create({
    name: name,
    handle: handle.toLowerCase().replace(/ /g, '-'),
    is_internal: true,
    is_active: isActive,
    parent_category_id: parent_category_id,
    metadata,
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
