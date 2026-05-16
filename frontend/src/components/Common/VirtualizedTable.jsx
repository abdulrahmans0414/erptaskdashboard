/**
 * VirtualizedTable.jsx
 * High-performance table component using @tanstack/react-virtual
 * Handles 1000+ rows without performance degradation
 */

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useMemo } from "react";
import { useState } from "react";

/**
 * VirtualizedTable Component
 * @param {array} data - Array of row objects
 * @param {array} columns - Column definitions: { key, header, width, render }
 * @param {function} onRowClick - Callback on row click
 * @param {function} onRowSelect - Callback for row selection
 * @param {number} rowHeight - Height of each row (default 50)
 * @param {number} visibleRows - Number of rows to render (default 20)
 */
export default function VirtualizedTable({
  data = [],
  columns = [],
  onRowClick = () => {},
  onRowSelect = () => {},
  rowHeight = 50,
  visibleRows = 20,
  isLoading = false,
  emptyMessage = "No data available",
}) {
  const parentRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Virtualize the rows
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10, // Render 10 extra rows for smooth scrolling
  });

  const virtualItems = virtualizer.getVirtualItems();

  const handleRowClick = (row, index) => {
    onRowClick(row, index);
  };

  const handleSelectRow = (e, index) => {
    e.stopPropagation();
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
    onRowSelect(Array.from(newSelected));
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const all = new Set(data.map((_, i) => i));
      setSelectedRows(all);
      onRowSelect(Array.from(all));
    } else {
      setSelectedRows(new Set());
      onRowSelect([]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div
          className="grid gap-0"
          style={{
            gridTemplateColumns: columns.map((c) => c.width || "1fr").join(" "),
          }}
        >
          {/* Select All Checkbox */}
          <div className="px-4 py-3 border-r border-gray-200">
            <input
              type="checkbox"
              checked={selectedRows.size === data.length && data.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 cursor-pointer"
              aria-label="Select all rows"
            />
          </div>

          {/* Column Headers */}
          {columns.map((column) => (
            <div
              key={column.key}
              className="px-4 py-3 border-r border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider"
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-y-auto"
        style={{ height: `${rowHeight * visibleRows}px` }}
        role="table"
        aria-label="Data table"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualItem) => {
            const row = data[virtualItem.index];
            const isSelected = selectedRows.has(virtualItem.index);

            return (
              <div
                key={virtualItem.index}
                data-index={virtualItem.index}
                className={`grid gap-0 border-b border-gray-200 cursor-pointer transition ${
                  isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                  gridTemplateColumns: columns
                    .map((c) => c.width || "1fr")
                    .join(" "),
                  height: `${rowHeight}px`,
                }}
                onClick={() => handleRowClick(row, virtualItem.index)}
                role="row"
              >
                {/* Checkbox */}
                <div
                  className="px-4 py-3 border-r border-gray-200 flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleSelectRow(e, virtualItem.index)}
                    className="w-4 h-4 cursor-pointer"
                    aria-label={`Select row ${virtualItem.index + 1}`}
                  />
                </div>

                {/* Row Data */}
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className="px-4 py-3 border-r border-gray-200 flex items-center text-sm text-gray-700 truncate"
                    role="cell"
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Table Footer with Info */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-xs text-gray-600">
        <span>
          Showing {Math.min(visibleRows, data.length)} of {data.length} rows
        </span>
        {selectedRows.size > 0 && (
          <span className="ml-4">• {selectedRows.size} selected</span>
        )}
      </div>
    </div>
  );
}
