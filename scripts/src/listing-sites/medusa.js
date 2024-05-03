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
