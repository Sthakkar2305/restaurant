'use client';

import { Users, CheckCircle } from 'lucide-react';

export interface Table {
  _id?: string;
  id?: string;
  name?: string;
  table_number: number;
  seating_capacity?: number;
  status: 'available' | 'occupied' | 'reserved';
  currentWaiterId?: string | null;
}

export interface TableSelectorProps {
  tables: Table[];
  selectedTableId?: string | null;
  selectedTable?: string | null;
  onSelectTable: (tableId: string) => void;
  currentUserId?: string | null;
}

export function TableSelector({
  tables = [],
  selectedTableId,
  selectedTable,
  onSelectTable,
}: TableSelectorProps) {
  const activeSelectedId = selectedTableId || selectedTable;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Users size={18} className="text-orange-500" />
          Select Dining Table
        </h2>
        <span className="text-xs text-slate-500 font-medium">
          {tables.filter((t) => t.status === 'available').length} Available / {tables.length} Total
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {tables.map((table) => {
          const tableId = table._id || table.id || String(table.table_number);
          const isSelected = activeSelectedId === tableId;
          const isAvailable = table.status === 'available';

          return (
            <button
              key={tableId}
              type="button"
              onClick={() => onSelectTable(tableId)}
              className={`
                p-3 rounded-xl font-semibold text-sm transition-all duration-200 min-h-[86px]
                flex flex-col items-center justify-center relative text-center border-2 cursor-pointer
                ${
                  isSelected
                    ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white border-orange-600 shadow-md scale-105 ring-2 ring-orange-200'
                    : isAvailable
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                }
              `}
            >
              {/* Table Name / Number */}
              <span className="font-bold text-base leading-tight break-words px-1">
                {table.name || `Table ${table.table_number}`}
              </span>

              {/* Status Subtitle */}
              <span
                className={`text-[10px] mt-1 font-medium px-2 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : isAvailable
                    ? 'bg-emerald-200/60 text-emerald-800'
                    : 'bg-amber-200 text-amber-900'
                }`}
              >
                {isAvailable ? 'Available' : 'Active Order'}
              </span>

              {/* Active Badge */}
              {isSelected && (
                <span className="absolute -top-1.5 -right-1.5 bg-white text-orange-600 rounded-full p-0.5 shadow">
                  <CheckCircle size={14} className="fill-orange-600 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}