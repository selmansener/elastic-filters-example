import ProductFilters from './ProductFilters';
import Pagination from './Pagination';
import { searchProducts } from '@/lib/search-products';
import type { ProductSort } from '@/types/product';

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brands?: string;
    tags?: string;
    inStock?: string;
    minPrice?: string;
    maxPrice?: string;
    minRating?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
  }>;
};

function toNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toSort(value?: string): ProductSort | undefined {
  switch (value) {
    case 'relevance':
    case 'price_asc':
    case 'price_desc':
    case 'rating_desc':
    case 'rating_asc':
      return value;
    default:
      return undefined;
  }
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const q = params.q?.trim() || undefined;
  const category = params.category?.trim() || undefined;
  const brands = params.brands
    ?.split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const tags = params.tags
    ?.split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const inStock = params.inStock === 'true' ? true : undefined;
  const minPrice = toNumber(params.minPrice);
  const maxPrice = toNumber(params.maxPrice);
  const minRating = toNumber(params.minRating);
  const sort = toSort(params.sort);
  const page = toNumber(params.page) ?? 1;
  const pageSize = toNumber(params.pageSize) ?? 24;

  const result = await searchProducts({
    q,
    category,
    brands,
    tags,
    inStock,
    minPrice,
    maxPrice,
    minRating,
    sort,
    page,
    pageSize,
  });

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-sm opacity-70">{result.total} results</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        <ProductFilters
          brands={result.facets.brands}
          categories={result.facets.categories}
          tags={result.facets.tags}
        />

        <section>
          {result.items.length === 0 ? (
            <div className="rounded-xl border p-8 text-center">
              No products found.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((product) => (
                  <article
                    key={product.id}
                    className="rounded-xl border p-4 shadow-sm"
                  >
                    <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-gray-100">
                      {product.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.thumbnail}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm opacity-70">
                        {product.categoryName}
                      </div>
                      <h2 className="font-semibold">{product.title}</h2>
                      <div className="text-sm opacity-80">
                        {product.brand ?? 'Unknown brand'}
                      </div>
                      <div className="font-bold">${product.price}</div>
                      <div className="text-sm">
                        Rating: {product.rating ?? 'N/A'}
                      </div>
                      <div className="text-sm">
                        {product.inStock ? 'In stock' : 'Out of stock'}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <Pagination
                total={result.total}
                currentPage={page}
                pageSize={pageSize}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}