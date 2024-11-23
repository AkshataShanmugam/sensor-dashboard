import React, { useEffect, useState } from "react";
import { useTable, useSortBy, usePagination } from "react-table";
import './LiveDataTable.css';
import { FaDownload } from "react-icons/fa"; 

const LiveDataTable = ({ sensorData, currentPage } ) => {

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
      data: sensorData,
      initialState: 
      { 
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
    // Convert the data to CSV format
    const headers = columns.map(column => column.Header);
    const rows = sensorData.map(row => 
      columns.map(column => row[column.accessor])
    );
  
    // Create CSV string
    const csvContent = [
      headers.join(','), // First row is the headers
      ...rows.map(row => row.join(',')) // Each row of data
    ].join('\n');
  
    // Create a link element to trigger the download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sensor_data.csv'; // Filename for the download
    link.click(); // Trigger the download
  };
  

  return (
    <div className="sensor-data-container">
      
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
