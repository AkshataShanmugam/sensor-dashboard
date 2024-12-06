import React, { useEffect, useState } from "react";
import { useTable, useSortBy, usePagination } from "react-table";
import './LiveDataTable.css';
import { FaDownload } from "react-icons/fa";

const LiveDataTable = ({ sensorData, currentPage }) => {
  const [filteredData, setFilteredData] = useState(sensorData); // Filtered data
  const [selectedMonth, setSelectedMonth] = useState(""); // Selected month for filtering

  // Update filteredData whenever sensorData or selectedMonth changes
  useEffect(() => {
    if (selectedMonth) {
      const monthFilteredData = sensorData.filter((row) => {
        const timestamp = row.timestamp;
        const [day, month, year] = timestamp.split(/[-_]/); // Split timestamp
        const parsedMonth = new Date(`${month} 1`).getMonth() + 1; // Convert to numeric month
        return parsedMonth === parseInt(selectedMonth);
      });
      setFilteredData(monthFilteredData);
    } else {
      setFilteredData(sensorData);
    }
  }, [sensorData, selectedMonth]);

  const columns = React.useMemo(
    () => [
      { Header: "Timestamp", accessor: "timestamp" },
      { Header: "Air Quality", accessor: "air_quality" },
      { Header: "Temperature (°C)", accessor: "temperature" },
      { Header: "Humidity (%)", accessor: "humidity" },
      { Header: "LDR Status", accessor: "ldr_value", Cell: ({ value }) => (value ? "Low" : "High") },
      { Header: "Sleep Mode", accessor: "sleep_mode", Cell: ({ value }) => (value ? "On" : "Off") },
      { Header: "PIR Status", accessor: "pir_value", Cell: ({ value }) => (value ? "Movement" : "No Movement") },
      { Header: "Light Status", accessor: "light_on", Cell: ({ value }) => (value ? "On" : "Off") },
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    page, // Rows for the current page
    canPreviousPage,
    canNextPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data: filteredData, // Use filtered data
      initialState: {
        pageIndex: currentPage,
        pageSize: 10,
        sortBy: [
          {
            id: "timestamp", // Sort by the "timestamp" column
            desc: true, // Reverse order (descending)
          },
        ],
      },
    },
    useSortBy,
    usePagination
  );

  const downloadCSV = () => {
    const headers = columns.map(column => column.Header);
    const rows = filteredData.map(row =>
      columns.map(column => row[column.accessor])
    );

    const csvContent = [
      headers.join(','), // First row is the headers
      ...rows.map(row => row.join(',')) // Each row of data
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sensor_data.csv';
    link.click();
  };

  return (
    <div className="sensor-data-container">
      {/* Filter by Month */}
      <div className="filter-container">
        <label htmlFor="month-filter">Filter by Month:</label>
        <select
          id="month-filter"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="" style={{fontFamily: "inherit" }}>All</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <button onClick={downloadCSV} className="download-csv-button">
        <FaDownload size={15} />
      </button>
      <table className="sensor-data-table" {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render("Header")}
                  <span>
                    {column.isSorted
                      ? column.isSortedDesc
                        ? " 🔽"
                        : " 🔼"
                      : ""}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => (
                  <td {...cell.getCellProps()}>{cell.render("Cell")}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button onClick={() => previousPage()} disabled={!canPreviousPage}>
          Previous
        </button>
        <span>
          Page{" "}
          <strong>
            {pageIndex + 1} of {Math.ceil(rows.length / pageSize)}
          </strong>
        </span>
        <button onClick={() => nextPage()} disabled={!canNextPage}>
          Next
        </button>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="select--option"
        >
          {[10, 15, 20, 30].map((size) => (
            <option key={size} value={size}>
              Show {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LiveDataTable;
