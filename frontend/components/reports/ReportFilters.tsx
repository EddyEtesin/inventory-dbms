'use client';

import { RotateCcw, Search } from 'lucide-react';

export type ReportFilterState = {
  fromDate: string;
  toDate: string;
  locationId: string;
  itemId: string;
  categoryId: string;
  txnType: string;
};

type LocationOption = {
  id: string;
  name: string;
};

type ItemOption = {
  id: string;
  sku: string;
  name: string;
  category?: {
    id: string;
    name: string;
  } | null;
};

type CategoryOption = {
  id: string;
  name: string;
};

type ReportFiltersProps = {
  filters: ReportFilterState;
  locations: LocationOption[];
  items: ItemOption[];
  categories: CategoryOption[];
  loading: boolean;
  onChange: (next: ReportFilterState) => void;
  onGenerate: () => void;
  onReset: () => void;
};

const inputClass =
  'w-full border border-[#2b2620]/20 bg-[#f5f0e3] px-3 py-2 font-mono text-[10px] text-[#2b2620] outline-none transition focus:border-[#2e4057]';

const labelClass =
  'mb-1.5 block font-mono text-[8px] tracking-[0.14em] text-[#5b5346]';

export default function ReportFilters({
  filters,
  locations,
  items,
  categories,
  loading,
  onChange,
  onGenerate,
  onReset,
}: ReportFiltersProps) {
  const update = (
    key: keyof ReportFilterState,
    value: string,
  ) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <section className="mb-5 border border-[#2b2620]/20 bg-[#f5f0e3]">
      <div className="flex items-center justify-between border-b border-[#2b2620]/15 px-4 py-3">
        <div>
          <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#2b2620]">
            REPORT FILTERS
          </div>

          <div className="mt-1 font-mono text-[8px] tracking-[0.08em] text-[#5b5346]">
            DEFINE THE LEDGER PERIOD AND SCOPE
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={loading}
          className="flex items-center gap-1.5 border border-[#2b2620]/20 px-2.5 py-1.5 font-mono text-[8px] tracking-widest text-[#5b5346] hover:bg-[#ddd0b8] disabled:opacity-50"
        >
          <RotateCcw size={12} strokeWidth={1.7} />
          RESET
        </button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div>
          <label className={labelClass}>FROM DATE</label>

          <input
            type="date"
            value={filters.fromDate}
            onChange={(event) =>
              update('fromDate', event.target.value)
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>TO DATE</label>

          <input
            type="date"
            value={filters.toDate}
            onChange={(event) =>
              update('toDate', event.target.value)
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>LOCATION</label>

          <select
            value={filters.locationId}
            onChange={(event) =>
              update('locationId', event.target.value)
            }
            className={inputClass}
          >
            <option value="">ALL LOCATIONS</option>

            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>ITEM</label>

          <select
            value={filters.itemId}
            onChange={(event) =>
              update('itemId', event.target.value)
            }
            className={inputClass}
          >
            <option value="">ALL ITEMS</option>

            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.sku} — {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>CATEGORY</label>

          <select
            value={filters.categoryId}
            onChange={(event) =>
              update('categoryId', event.target.value)
            }
            className={inputClass}
          >
            <option value="">ALL CATEGORIES</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>TRANSACTION TYPE</label>

          <select
            value={filters.txnType}
            onChange={(event) =>
              update('txnType', event.target.value)
            }
            className={inputClass}
          >
            <option value="">ALL MOVEMENTS</option>
            <option value="opening_balance">OPENING BALANCE</option>
            <option value="receive">RECEIVE</option>
            <option value="issue">ISSUE</option>
            <option value="adjustment">ADJUSTMENT</option>
            <option value="transfer">TRANSFER</option>
            <option value="return">RETURN</option>
            <option value="damage">DAMAGE</option>
            <option value="expiry">EXPIRY</option>
            <option value="loss">LOSS</option>
          </select>
        </div>
      </div>

      <div className="border-t border-[#2b2620]/15 px-4 py-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="flex items-center gap-2 bg-[#c68a2e] px-4 py-2.5 font-mono text-[9px] font-semibold tracking-widest text-[#2b2620] hover:bg-[#b97e26] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search size={13} strokeWidth={1.8} />
          {loading ? 'GENERATING...' : 'GENERATE REPORT'}
        </button>
      </div>
    </section>
  );
}