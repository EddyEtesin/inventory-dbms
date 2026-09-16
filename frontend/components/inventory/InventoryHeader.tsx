'use client';

import { Search } from 'lucide-react';

type StatusFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

type Props = {
  search: string;
  statusFilter: StatusFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
};

export default function InventoryHeader({
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: Props) {
  return (
    <section className="relative border border-[#b7a87e] bg-[#f5f0e3] px-5 py-5 shadow-[0_2px_0_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)] md:px-7">
      <div className="pointer-events-none absolute inset-2 border border-dashed border-[#2b2620]/20" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
              INVENTORY REGISTER
            </div>
            <h1 className="mt-1 font-mono text-[28px] leading-none">
              STOCK RECORDS
            </h1>
            <p className="mt-1 font-mono text-[9px] text-[#5b5346]">
              Search, review and operate on inventory across locations.
            </p>
          </div>

          <div className="hidden border-2 border-[#a63a2e] px-2.5 py-1 font-mono text-[8px] tracking-widest text-[#a63a2e] md:block">
            LIVE REGISTER
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={15}
              strokeWidth={1.7}
              className="absolute left-1 top-2.5 text-[#5b5346]"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="SEARCH ITEM, SKU OR CATEGORY..."
              className="w-full border-0 border-b border-[#2b2620] bg-transparent py-2 pl-7 font-mono text-[10px] outline-none placeholder:text-[#5b5346]"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterButton
              label="ALL"
              active={statusFilter === 'ALL'}
              onClick={() => onStatusChange('ALL')}
            />
            <FilterButton
              label="IN STOCK"
              active={statusFilter === 'IN_STOCK'}
              onClick={() => onStatusChange('IN_STOCK')}
            />
            <FilterButton
              label="LOW STOCK"
              active={statusFilter === 'LOW_STOCK'}
              onClick={() => onStatusChange('LOW_STOCK')}
            />
            <FilterButton
              label="OUT"
              active={statusFilter === 'OUT_OF_STOCK'}
              onClick={() => onStatusChange('OUT_OF_STOCK')}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-3 py-1.5 font-mono text-[8px] ${
        active
          ? 'border-[#2e4057] bg-[#2e4057] text-[#f5f0e3]'
          : 'border-[#2b2620]'
      }`}
    >
      {label}
    </button>
  );
}
