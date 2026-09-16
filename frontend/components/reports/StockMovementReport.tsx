'use client';

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ClipboardList,
  PackageOpen,
} from 'lucide-react';

export type StockMovementRow = {
  id: string;
  date: string;
  action: string;
  txnType: string;
  quantity: number;
  reference: string | null;
  notes: string | null;
  transferId: string | null;
  item: {
    id: string;
    sku: string;
    name: string;
    unitOfMeasure: string;
    category: {
      id: string;
      name: string;
    } | null;
  };
  location: {
    id: string;
    name: string;
    locationType: string;
  };
  performedBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type StockMovementSummary = {
  transactionCount: number;
  totalReceived: number;
  totalIssued: number;
  totalAdjusted: number;
  totalTransferred: number;
};

type StockMovementReportProps = {
  rows: StockMovementRow[];
  summary: StockMovementSummary;
  loading: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatQuantity(quantity: number) {
  return `${quantity > 0 ? '+' : ''}${quantity}`;
}

function getActionClass(txnType: string) {
  switch (txnType) {
    case 'receive':
    case 'opening_balance':
    case 'return':
      return 'text-[#3d6b4f]';

    case 'issue':
    case 'damage':
    case 'expiry':
    case 'loss':
      return 'text-[#a63a2e]';

    case 'transfer':
      return 'text-[#2e4057]';

    default:
      return 'text-[#5b5346]';
  }
}

function ActionIcon({ txnType }: { txnType: string }) {
  if (
    txnType === 'receive' ||
    txnType === 'opening_balance' ||
    txnType === 'return'
  ) {
    return <ArrowDownToLine size={13} strokeWidth={1.7} />;
  }

  if (
    txnType === 'issue' ||
    txnType === 'damage' ||
    txnType === 'expiry' ||
    txnType === 'loss'
  ) {
    return <ArrowUpFromLine size={13} strokeWidth={1.7} />;
  }

  if (txnType === 'transfer') {
    return <ArrowLeftRight size={13} strokeWidth={1.7} />;
  }

  return <ClipboardList size={13} strokeWidth={1.7} />;
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-[#2b2620]/20 bg-[#f5f0e3] px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8px] tracking-[0.14em] text-[#5b5346]">
          {label}
        </span>

        <span className="text-[#2e4057]">{icon}</span>
      </div>

      <div className="mt-2 font-mono text-[19px] text-[#2b2620]">
        {value}
      </div>
    </div>
  );
}

export default function StockMovementReport({
  rows,
  summary,
  loading,
}: StockMovementReportProps) {
  return (
    <section className="border border-[#2b2620]/20 bg-[#f5f0e3]">
      <div className="border-b border-[#2b2620]/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <PackageOpen
            size={15}
            strokeWidth={1.7}
            className="text-[#2e4057]"
          />

          <div>
            <div className="font-mono text-[9px] font-semibold tracking-[0.16em]">
              STOCK MOVEMENT REGISTER
            </div>

            <div className="mt-1 font-mono text-[8px] tracking-[0.08em] text-[#5b5346]">
              CHRONOLOGICAL TRANSACTION LEDGER
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-[#2b2620]/10 md:grid-cols-5">
        <SummaryCard
          label="TRANSACTIONS"
          value={summary.transactionCount}
          icon={<ClipboardList size={14} strokeWidth={1.7} />}
        />

        <SummaryCard
          label="RECEIVED"
          value={summary.totalReceived}
          icon={<ArrowDownToLine size={14} strokeWidth={1.7} />}
        />

        <SummaryCard
          label="ISSUED"
          value={summary.totalIssued}
          icon={<ArrowUpFromLine size={14} strokeWidth={1.7} />}
        />

        <SummaryCard
          label="ADJUSTMENTS"
          value={summary.totalAdjusted}
          icon={<ClipboardList size={14} strokeWidth={1.7} />}
        />

        <SummaryCard
          label="TRANSFERRED"
          value={summary.totalTransferred}
          icon={<ArrowLeftRight size={14} strokeWidth={1.7} />}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full border-collapse">
          <thead>
            <tr className="border-b border-[#2b2620]/20 bg-[#ddd0b8] text-left">
              <th className="px-4 py-3 font-mono text-[8px] tracking-[0.14em]">
                DATE
              </th>
              <th className="px-4 py-3 font-mono text-[8px] tracking-[0.14em]">
                ITEM
              </th>
              <th className="px-4 py-3 font-mono text-[8px] tracking-[0.14em]">
                LOCATION
              </th>
              <th className="px-4 py-3 font-mono text-[8px] tracking-[0.14em]">
                ACTION
              </th>
              <th className="px-4 py-3 text-right font-mono text-[8px] tracking-[0.14em]">
                QTY
              </th>
              <th className="px-4 py-3 font-mono text-[8px] tracking-[0.14em]">
                REFERENCE
              </th>
              <th className="px-4 py-3 font-mono text-[8px] tracking-[0.14em]">
                BY
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center font-mono text-[9px] tracking-wider text-[#5b5346]"
                >
                  LOADING REPORT...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center font-mono text-[9px] tracking-wider text-[#5b5346]"
                >
                  NO STOCK MOVEMENTS FOUND.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#2b2620]/10 hover:bg-[#ddd0b8]/35"
                >
                  <td className="px-4 py-3 align-top font-mono text-[9px] text-[#5b5346]">
                    {formatDate(row.date)}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="font-mono text-[9px] font-semibold text-[#2b2620]">
                      {row.item.name}
                    </div>

                    <div className="mt-1 font-mono text-[8px] tracking-wider text-[#5b5346]">
                      {row.item.sku}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="font-mono text-[9px] text-[#2b2620]">
                      {row.location.name}
                    </div>

                    <div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-[#5b5346]">
                      {row.location.locationType}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div
                      className={`flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${getActionClass(
                        row.txnType,
                      )}`}
                    >
                      <ActionIcon txnType={row.txnType} />
                      {row.action}
                    </div>

                    {row.notes && (
                      <div className="mt-1 max-w-[220px] font-mono text-[8px] text-[#5b5346]">
                        {row.notes}
                      </div>
                    )}
                  </td>

                  <td
                    className={`px-4 py-3 text-right align-top font-mono text-[10px] font-semibold ${
                      row.quantity >= 0
                        ? 'text-[#3d6b4f]'
                        : 'text-[#a63a2e]'
                    }`}
                  >
                    {formatQuantity(row.quantity)}
                  </td>

                  <td className="px-4 py-3 align-top font-mono text-[9px] text-[#5b5346]">
                    {row.reference || '—'}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="font-mono text-[9px] text-[#2b2620]">
                      {row.performedBy.name ||
                        row.performedBy.email}
                    </div>

                    {row.transferId && (
                      <div className="mt-1 font-mono text-[8px] tracking-wider text-[#5b5346]">
                        TRANSFER LINKED
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}