'use client';

// Updated interface to include 'name'
interface Table {
  id: string;
  name?: string; // Optional because old data might not have it
  table_number: number;
  seating_capacity: number;
  status: 'available' | 'occupied' | 'reserved';
}

interface TableSelectorProps {
  tables: Table[];
  selectedTable: string | null;
  onSelectTable: (tableId: string) => void;
}

export function TableSelector({
  tables,
  selectedTable,
  onSelectTable,
}: TableSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Select Table</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => onSelectTable(table.id)}
            disabled={table.status !== 'available'}
            className={`
              p-2 rounded-lg font-bold text-sm transition-all min-h-[80px]
              flex flex-col items-center justify-center relative text-center
              ${
                selectedTable === table.id
                  ? 'bg-orange-500 text-white shadow-lg scale-105'
                  : table.status === 'available'
                    ? 'bg-green-100 text-green-900 hover:bg-green-200'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {/* Show Name if exists (Garden-1), otherwise show Number */}
            <span className="break-words w-full px-1">
                {table.name || `Table ${table.table_number}`}
            </span>
            
            {table.status !== 'available' && (
              <span className="absolute top-1 right-1 text-[10px] bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}