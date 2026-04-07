'use client';

import { useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Props = {
  total: number;
  currentPage: number;
  pageSize: number;
  pageSizeOptions?: number[];
};

function buildPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];

  pages.push(1);

  if (currentPage > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis');
  }

  pages.push(totalPages);

  return pages;
}

export default function Pagination({
  total,
  currentPage,
  pageSize,
  pageSizeOptions = [12, 24, 48, 96],
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const visiblePages = useMemo(() => {
    return buildPageNumbers(currentPage, totalPages);
  }, [currentPage, totalPages]);

  function pushWithParams(params: URLSearchParams) {
    const qs = params.toString();

    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function goToPage(page: number) {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const params = new URLSearchParams(searchParams.toString());

    if (safePage <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(safePage));
    }

    pushWithParams(params);
  }

  function onPageSizeChange(nextPageSize: number) {
    const params = new URLSearchParams(searchParams.toString());

    params.set('pageSize', String(nextPageSize));
    params.delete('page');

    pushWithParams(params);
  }

  if (total <= 0) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between">
      <div className="text-sm opacity-80">
        Showing page {currentPage} of {totalPages} · {total} total results
        {isPending ? <span className="ml-2">Updating...</span> : null}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <label className="flex items-center gap-2 text-sm">
          <span>Page size</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border px-3 py-2"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <nav className="flex items-center gap-2" aria-label="Pagination">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="rounded-md border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {visiblePages.map((item, index) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => goToPage(item)}
                  aria-current={item === currentPage ? 'page' : undefined}
                  className={`rounded-md border px-3 py-2 ${
                    item === currentPage ? 'font-semibold underline' : ''
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="rounded-md border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  );
}