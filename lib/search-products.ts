import type {
  AggregationsStringTermsAggregate,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { elastic } from './elasticsearch';
import type { Product, ProductSearchResult, FacetItem } from '@/types/product';

export type ProductSearchParams = {
  q?: string;
  category?: string;
  brands?: string[];
  tags?: string[];
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  pageSize?: number;
};

function parseStringTermsFacet(
  agg: AggregationsStringTermsAggregate | undefined
): FacetItem[] {
  if (!agg || !('buckets' in agg) || !Array.isArray(agg.buckets)) {
    return [];
  }

  return agg.buckets
    .map((bucket) => {
      if (typeof bucket.key !== 'string' || bucket.doc_count == null) {
        return null;
      }

      return {
        value: bucket.key,
        count: bucket.doc_count,
      };
    })
    .filter((item): item is FacetItem => item !== null);
}

export async function searchProducts(
  params: ProductSearchParams
): Promise<ProductSearchResult> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize =
    params.pageSize && params.pageSize > 0 ? params.pageSize : 24;

  const must: QueryDslQueryContainer[] = [];
  const filter: QueryDslQueryContainer[] = [];

  if (params.q) {
    must.push({
      multi_match: {
        query: params.q,
        fields: ['title^3', 'description', 'brand', 'categoryName', 'tags'],
      },
    });
  }

  if (params.category) {
    filter.push({
      term: {
        category: params.category,
      },
    });
  }

  if (params.brands?.length) {
    filter.push({
      terms: {
        brand: params.brands,
      },
    });
  }

  if (params.tags?.length) {
    filter.push({
      terms: {
        tags: params.tags,
      },
    });
  }

  if (params.inStock != null) {
    filter.push({
      term: {
        inStock: params.inStock,
      },
    });
  }

  if (params.minPrice != null || params.maxPrice != null) {
    filter.push({
      range: {
        price: {
          ...(params.minPrice != null ? { gte: params.minPrice } : {}),
          ...(params.maxPrice != null ? { lte: params.maxPrice } : {}),
        },
      },
    });
  }

  if (params.minRating != null) {
    filter.push({
      range: {
        rating: {
          gte: params.minRating,
        },
      },
    });
  }

  const response = await elastic.search<Product>({
    index: 'products',
    from: (page - 1) * pageSize,
    size: pageSize,
    query: {
      bool: {
        must,
        filter,
      },
    },
    aggs: {
      brands: {
        terms: {
          field: 'brand',
          size: 20,
        },
      },
      categories: {
        terms: {
          field: 'category',
          size: 20,
        },
      },
      tags: {
        terms: {
          field: 'tags',
          size: 20,
        },
      },
    },
    sort: params.q
      ? undefined
      : [
          { rating: { order: 'desc', missing: '_last' } },
          { price: { order: 'asc' } },
        ],
  });

  return {
    items: response.hits.hits
      .map((hit) => hit._source)
      .filter((item): item is Product => item != null),
    total:
      typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total?.value ?? 0),
    facets: {
      brands: parseStringTermsFacet(
        response.aggregations?.brands as AggregationsStringTermsAggregate | undefined
      ),
      categories: parseStringTermsFacet(
        response.aggregations?.categories as AggregationsStringTermsAggregate | undefined
      ),
      tags: parseStringTermsFacet(
        response.aggregations?.tags as AggregationsStringTermsAggregate | undefined
      ),
    },
  };
}