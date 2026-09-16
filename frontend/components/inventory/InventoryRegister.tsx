'use client';

import { ChevronRight } from 'lucide-react';
import type { RegisterItem } from '../../types/inventory';

type Props = {
  items: RegisterItem[];
  loading: boolean;
  onOpenItem: (item: RegisterItem) => void;
};

export default function InventoryRegister({
  items,
  loading,
  onOpenItem,
}: Props) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <div className="font-mono text-[8px] text-[#5b5346]">
            {items.length} RECORDS
          </div>
          <h2 className="font-mono text-[17px]">INVENTORY REGISTER</h2>
        </div>
        <div className="font-mono text-[8px] text-[#5b5346]">
          Click a record to inspect
        </div>
      </div>

      <div className="overflow-hidden border border-[#b7a87e] bg-[#f5f0e3] shadow-[1px_2px_0_#b7a87e]">
        <div className="hidden grid-cols-[minmax(220px,1.8fr)_120px_100px_100px_125px] gap-3 border-b border-[#b7a87e] bg-[#ddd0b8] px-4 py-2.5 font-mono text-[7px] tracking-widest text-[#5b5346] md:grid">
          <span>ITEM</span>
          <span>SKU</span>
          <span>LOCATIONS</span>
          <span>QTY</span>
          <span>STATUS</span>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center font-mono text-[9px] text-[#5b5346]">
            LOADING INVENTORY...
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-[9px] italic text-[#5b5346]">
            No inventory records match your filters.
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenItem(item)}
              className="grid w-full grid-cols-1 gap-2 border-b border-dashed border-[#b7a87e] px-4 py-3 text-left last:border-b-0 hover:bg-[#eae2ce] md:grid-cols-[minmax(220px,1.8fr)_120px_100px_100px_125px] md:items-center md:gap-3"
            >
              <div className="min-w-0">
                <div className="truncate font-mono text-[11px]">{item.name}</div>
                <div className="mt-0.5 font-mono text-[7px] text-[#5b5346] md:hidden">
                  {item.sku} · {item.category?.name}
                </div>
              </div>

              <div className="hidden font-mono text-[8px] md:block">{item.sku}</div>
              <div className="hidden font-mono text-[8px] md:block">{item.locations}</div>

              <div className="font-mono text-[10px]">
                {item.quantity}{' '}
                <span className="text-[7px] text-[#5b5346]">{item.unitOfMeasure}</span>
              </div>

              <div className="flex items-center justify-between">
                <StatusBadge status={item.status} />
                <ChevronRight size={15} className="text-[#5b5346]" />
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}) {
  const label =
    status === 'IN_STOCK'
      ? 'IN STOCK'
      : status === 'LOW_STOCK'
        ? 'REORDER'
        : 'OUT';

  const classes =
    status === 'IN_STOCK'
      ? 'border-[#3d6b4f] text-[#3d6b4f]'
      : status === 'LOW_STOCK'
        ? 'border-[#c68a2e] text-[#9b681b]'
        : 'border-[#a63a2e] text-[#a63a2e]';

  return (
    <span className={`inline-block border px-2 py-1 font-mono text-[7px] ${classes}`}>
      {label}
    </span>
  );
}
