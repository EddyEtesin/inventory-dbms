'use client';

import { BarChart3 } from 'lucide-react';

export default function ReportsHeader() {
  return (
    <header className="mb-5 border-b border-[#2b2620]/15 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <BarChart3
              size={20}
              strokeWidth={1.7}
              className="text-[#2e4057]"
            />

            <h1 className="font-mono text-[18px] font-semibold tracking-[0.08em] text-[#2b2620]">
              REPORTS
            </h1>
          </div>

          <p className="font-mono text-[9px] tracking-[0.12em] text-[#5b5346]">
            INVENTORY MOVEMENT &amp; LEDGER REPORTING
          </p>
        </div>

        <div className="hidden border-l border-[#2b2620]/15 pl-4 text-right md:block">
          <div className="font-mono text-[8px] tracking-[0.16em] text-[#5b5346]">
            REPORT TYPE
          </div>

          <div className="mt-1 font-mono text-[10px] tracking-wider text-[#2b2620]">
            STOCK MOVEMENT
          </div>
        </div>
      </div>
    </header>
  );
}