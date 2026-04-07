'use client';

import { FormEvent, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { FacetItem } from '@/types/product';

type Props = {
  brands: FacetItem[];
  categories: FacetItem[];
  tags: FacetItem[];
};

function toggleMultiValue(currentValues: string[], nextValue: string): string[] {
  if (currentValues.includes(nextValue)) {
    return currentValues.filter((v) => v !== nextValue);
  }

  return [...currentValues, nextValue];
}

export default function ProductFilters({
  brands,
  categories,
  tags,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedBrands = useMemo(() => {
    return (searchParams.get('brands') ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }, [searchParams]);

  const selectedTags = useMemo(() => {
    return (searchParams.get('tags') ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }, [searchParams]);

  const selectedCategory = searchParams.get('category') ?? '';
  const inStock = searchParams.get('inStock') === 'true';

  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '');
  const [minRating, setMinRating] = useState(searchParams.get('minRating') ?? '');

  function pushParams(params: URLSearchParams) {
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function updateParams(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    params.delete('page');
    pushParams(params);
  }

  function onSubmitFilters(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const params = new URLSearchParams(searchParams.toString());

    const qValue = q.trim();
    const minPriceValue = minPrice.trim();
    const maxPriceValue = maxPrice.trim();
    const minRatingValue = minRating.trim();

    if (qValue) params.set('q', qValue);
    else params.delete('q');

    if (minPriceValue) params.set('minPrice', minPriceValue);
    else params.delete('minPrice');

    if (maxPriceValue) params.set('maxPrice', maxPriceValue);
    else params.delete('maxPrice');

    if (minRatingValue) params.set('minRating', minRatingValue);
    else params.delete('minRating');

    params.delete('page');
    pushParams(params);
  }

  function onCategoryChange(value: string) {
    updateParams((params) => {
      if (!value) params.delete('category');
      else params.set('category', value);
    });
  }

  function onBrandToggle(value: string) {
    updateParams((params) => {
      const current = (params.get('brands') ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

      const next = toggleMultiValue(current, value);

      if (next.length === 0) params.delete('brands');
      else params.set('brands', next.join(','));
    });
  }

  function onTagToggle(value: string) {
    updateParams((params) => {
      const current = (params.get('tags') ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

      const next = toggleMultiValue(current, value);

      if (next.length === 0) params.delete('tags');
      else params.set('tags', next.join(','));
    });
  }

  function onInStockChange(checked: boolean) {
    updateParams((params) => {
      if (checked) params.set('inStock', 'true');
      else params.delete('inStock');
    });
  }

  function clearAll() {
    setQ('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <aside className="w-full max-w-xs space-y-6 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <button type="button" onClick={clearAll} className="text-sm underline">
          Clear all
        </button>
      </div>

      {isPending ? <div className="text-sm opacity-70">Updating...</div> : null}

      <form onSubmit={onSubmitFilters} className="space-y-4">
        <section className="space-y-2">
          <h3 className="font-medium">Search</h3>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-md border px-3 py-2"
          />
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">Price</h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min"
              className="w-full rounded-md border px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">Minimum rating</h3>
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">Any rating</option>
            <option value="4.5">4.5+</option>
            <option value="4">4.0+</option>
            <option value="3.5">3.5+</option>
            <option value="3">3.0+</option>
          </select>
        </section>

        <button
          type="submit"
          className="w-full rounded-md border px-3 py-2 font-medium"
        >
          Apply
        </button>
      </form>

      <section className="space-y-2">
        <h3 className="font-medium">Category</h3>
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.value} ({item.count})
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => onInStockChange(e.target.checked)}
          />
          <span>In stock only</span>
        </label>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">Brands</h3>
        <div className="space-y-2">
          {brands.map((item) => (
            <label key={item.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedBrands.includes(item.value)}
                onChange={() => onBrandToggle(item.value)}
              />
              <span>
                {item.value} ({item.count})
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">Tags</h3>
        <div className="space-y-2">
          {tags.map((item) => (
            <label key={item.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTags.includes(item.value)}
                onChange={() => onTagToggle(item.value)}
              />
              <span>
                {item.value} ({item.count})
              </span>
            </label>
          ))}
        </div>
      </section>
    </aside>
  );
}