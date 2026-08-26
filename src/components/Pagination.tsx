import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalCount,
  limit,
  onPageChange
}) => {
  const totalPages = Math.ceil(totalCount / limit);

  if (totalPages <= 1) return null;

  // Generate page numbers window
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');

      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 my-10">
      
      {/* First Page */}
      <button
        onClick={() => handlePageClick(1)}
        disabled={currentPage === 1}
        className="p-2 sm:px-3.5 sm:py-2 bg-[#0a0a0a] hover:bg-[#151515] disabled:opacity-30 disabled:hover:bg-[#0a0a0a] text-neutral-300 rounded-full border border-white/10 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
        aria-label="First page"
      >
        <ChevronsLeft className="w-4 h-4" />
        <span className="hidden sm:inline">First</span>
      </button>

      {/* Prev Page */}
      <button
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 sm:px-3.5 sm:py-2 bg-[#0a0a0a] hover:bg-[#151515] disabled:opacity-30 disabled:hover:bg-[#0a0a0a] text-neutral-300 rounded-full border border-white/10 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      {/* Page Numbers */}
      {getPageNumbers().map((p, idx) => {
        if (p === '...') {
          return (
            <span key={`dots-${idx}`} className="px-2 text-neutral-600 font-mono text-sm">
              ...
            </span>
          );
        }

        const pageNum = Number(p);
        const isActive = pageNum === currentPage;

        return (
          <button
            key={pageNum}
            onClick={() => handlePageClick(pageNum)}
            className={`min-w-9 h-9 px-3 rounded-full text-xs font-bold font-mono transition-all cursor-pointer ${
              isActive
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                : 'bg-[#0a0a0a] hover:bg-[#151515] text-neutral-300 border border-white/10'
            }`}
          >
            {pageNum}
          </button>
        );
      })}

      {/* Next Page */}
      <button
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="p-2 sm:px-3.5 sm:py-2 bg-[#0a0a0a] hover:bg-[#151515] disabled:opacity-30 disabled:hover:bg-[#0a0a0a] text-neutral-300 rounded-full border border-white/10 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Last Page */}
      <button
        onClick={() => handlePageClick(totalPages)}
        disabled={currentPage >= totalPages}
        className="p-2 sm:px-3.5 sm:py-2 bg-[#0a0a0a] hover:bg-[#151515] disabled:opacity-30 disabled:hover:bg-[#0a0a0a] text-neutral-300 rounded-full border border-white/10 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
        aria-label="Last page"
      >
        <span className="hidden sm:inline">Last ({totalPages})</span>
        <ChevronsRight className="w-4 h-4" />
      </button>

    </div>
  );
};
