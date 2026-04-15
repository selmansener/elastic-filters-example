const { headers } = require("next/headers");

const ELASTIC_URL = 'http://localhost:9200';
const PRODUCTS_INDEX = 'products-example';
const CATEGORIES_INDEX = 'categories-example';
const ELASTIC_USERNAME = 'elastic';
const ELASTIC_PASSWORD = process.env.ELASTIC_PASSWORD || 'qwe123**';

function elasticAuthHeader() {
  return `Basic ${Buffer.from(`${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}`).toString('base64')}`;
}

async function es(path, options = {}) {
  const res = await fetch(`${ELASTIC_URL}${path}`, {
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      "Authorization": elasticAuthHeader(),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Elasticsearch error ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }

  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers:  {
      "Authorization": elasticAuthHeader(),
    }
  });
  if (!res.ok) {
    throw new Error(`Request failed ${res.status}: ${url}`);
  }
  return res.json();
}

async function indexExists(indexName) {
  const res = await fetch(`${ELASTIC_URL}/${indexName}`, { method: 'HEAD', headers: {
    
      "Authorization": elasticAuthHeader(),
  } });
  return res.status === 200;
}

async function deleteIndexIfExists(indexName) {
  const exists = await indexExists(indexName);
  if (!exists) {
    console.log(`Index '${indexName}' does not exist, skipping delete`);
    return;
  }

  await es(`/${indexName}`, { 
    method: 'DELETE' ,
    headers: {
      "Authorization": elasticAuthHeader(),
    }
  });
  console.log(`Deleted index '${indexName}'`);
}

async function createCategoriesIndex() {
  await es(`/${CATEGORIES_INDEX}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      "Authorization": elasticAuthHeader(),
    },
    body: JSON.stringify({
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'keyword' },
          slug: { type: 'keyword' },
          url: { type: 'keyword' },
        },
      },
    }),
  });

  console.log(`Created index '${CATEGORIES_INDEX}'`);
}

async function createProductsIndex() {
  await es(`/${PRODUCTS_INDEX}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      "Authorization": elasticAuthHeader(),
    },
    body: JSON.stringify({
      mappings: {
        properties: {
          id: { type: 'integer' },
          title: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
          description: { type: 'text' },
          category: { type: 'keyword' },
          categoryName: { type: 'keyword' },
          brand: { type: 'keyword' },
          price: { type: 'float' },
          discountPercentage: { type: 'float' },
          rating: { type: 'float' },
          stock: { type: 'integer' },
          inStock: { type: 'boolean' },
          sku: { type: 'keyword' },
          weight: { type: 'float' },
          availabilityStatus: { type: 'keyword' },
          thumbnail: { type: 'keyword' },
          images: { type: 'keyword' },
          tags: { type: 'keyword' },
        },
      },
    }),
  });

  console.log(`Created index '${PRODUCTS_INDEX}'`);
}

async function fetchAllProducts() {
  const limit = 100;
  let skip = 0;
  let total = null;
  const products = [];

  while (total === null || skip < total) {
    const data = await fetchJson(
      `https://dummyjson.com/products?limit=${limit}&skip=${skip}`
    );

    total = data.total;
    products.push(...data.products);
    skip += limit;

    console.log(`Fetched ${products.length}/${total} products`);
  }

  return products;
}

function titleizeCategory(slug) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildCategories(products) {
  const map = new Map();

  for (const product of products) {
    const slug = product.category;
    if (!slug) continue;

    if (!map.has(slug)) {
      map.set(slug, {
        id: slug,
        name: titleizeCategory(slug),
        slug,
        url: `/products?category=${encodeURIComponent(slug)}`,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeProducts(products) {
  return products.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    categoryName: titleizeCategory(p.category),
    brand: p.brand || null,
    price: p.price,
    discountPercentage: p.discountPercentage ?? null,
    rating: p.rating ?? null,
    stock: p.stock ?? 0,
    inStock: (p.stock ?? 0) > 0,
    sku: p.sku || null,
    weight: p.weight ?? null,
    availabilityStatus: p.availabilityStatus || null,
    thumbnail: p.thumbnail || null,
    images: Array.isArray(p.images) ? p.images : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
  }));
}

async function bulkIndex(indexName, docs, getId) {
  if (!docs.length) {
    console.log(`No docs to index for '${indexName}'`);
    return;
  }

  const lines = [];

  for (const doc of docs) {
    lines.push(
      JSON.stringify({
        index: {
          _index: indexName,
          _id: String(getId(doc)),
        },
      })
    );
    lines.push(JSON.stringify(doc));
  }

  const body = `${lines.join('\n')}\n`;

  const res = await fetch(`${ELASTIC_URL}/_bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-ndjson',
      "Authorization": elasticAuthHeader(),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bulk request failed ${res.status}: ${text}`);
  }

  const result = await res.json();

  if (result.errors) {
    const failed = result.items.filter((item) => item.index?.error);
    console.error('Bulk errors:', failed.slice(0, 5));
    throw new Error(`Bulk indexing for '${indexName}' completed with errors`);
  }

  console.log(`Indexed ${docs.length} docs into '${indexName}'`);
}

async function refreshIndex(indexName) {
  await es(`/${indexName}/_refresh`, { method: 'POST' });
}

async function main() {
  try {
    console.log('Resetting indices...');
    await deleteIndexIfExists(PRODUCTS_INDEX);
    await deleteIndexIfExists(CATEGORIES_INDEX);

    console.log('Creating indices...');
    await createProductsIndex();
    await createCategoriesIndex();

    console.log('Fetching products...');
    const rawProducts = await fetchAllProducts();

    console.log('Normalizing data...');
    const products = normalizeProducts(rawProducts);
    const categories = buildCategories(rawProducts);

    console.log('Bulk indexing...');
    await bulkIndex(PRODUCTS_INDEX, products, (doc) => doc.id);
    await bulkIndex(CATEGORIES_INDEX, categories, (doc) => doc.id);

    await refreshIndex(PRODUCTS_INDEX);
    await refreshIndex(CATEGORIES_INDEX);

    console.log('Done.');
    console.log(`Products indexed: ${products.length}`);
    console.log(`Categories indexed: ${categories.length}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();