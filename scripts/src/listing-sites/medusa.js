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
  });
  return response.product;
}

export async function getProducts(category) {
  const response = await medusa.admin.products.list({
    category_id: [category],
    fields: 'metadata',
  });
  return response.products ? response.products.map((product) => product.metadata.cardNumber) : [];
}
