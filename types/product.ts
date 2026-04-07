export type Product = {
  id: number;
  title: string;
  description: string;
  category: string;
  categoryName: string;
  brand?: string | null;
  price: number;
  rating?: number | null;
  stock: number;
  inStock: boolean;
  tags?: string[];
  thumbnail?: string | null;
};

export type FacetItem = {
  value: string;
  count: number;
};

export type ProductSearchResult = {
  items: Product[];
  total: number;
  facets: {
    brands: FacetItem[];
    categories: FacetItem[];
    tags: FacetItem[];
  };
};