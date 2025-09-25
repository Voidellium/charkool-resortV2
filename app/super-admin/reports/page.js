'use client';
import { useEffect, useState, useRef } from "react";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend, LineChart, Line 
} from "recharts";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [filters, setFilters] = useState({ userType: "All", status: "All" });

  const revenueRef = useRef(null);
  const bookingsTrendRef = useRef(null);
  const amenitiesRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    handleGenerate(); // load on mount
  }, []);

  async function fetchReport(startDate, endDate, userType, status) {
    try {
      let url = '/api/reports';
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }
      if (userType && userType !== "All") params.append("userType", userType);
      if (status && status !== "All") params.append("status", status);

      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" }});
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      alert("Error fetching report");
      console.error(err);
      return null;
    }
  }

  const handleGenerate = async () => {
    const data = await fetchReport(
      dateRange.start,
      dateRange.end,
      filters.userType,
      filters.status
    );
    if (data) setReport(data);
  };

  const exportPDF = () => {
    if (!report?.bookings?.length) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Booking Report", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [["Date", "Customer", "Room", "Total Price", "Status"]],
      body: report.bookings.map(b => [
        new Date(b.createdAt).toLocaleDateString(),
        b.user?.name || "N/A",
        b.room?.name || "N/A",
        "₱" + b.totalPrice,
        b.status
      ]),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [0, 123, 255], textColor: 255, fontStyle: 'bold' },
    });
    doc.save("report.pdf");
  };

  const exportExcel = () => {
    if (!report?.bookings?.length) return;
    const ws = XLSX.utils.json_to_sheet(report.bookings.map(b => ({
      Date: new Date(b.createdAt).toLocaleDateString(),
      Customer: b.user?.name || "N/A",
      Room: b.room?.name || "N/A",
      "Total Price": b.totalPrice,
      Status: b.status,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, "report.xlsx");
  };

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <SuperAdminLayout 
      activePage="reports"
      reportMenu={[
        { label: "Revenue by Month", onClick: () => scrollToSection(revenueRef) },
        { label: "Bookings Trend", onClick: () => scrollToSection(bookingsTrendRef) },
        { label: "Amenities Usage", onClick: () => scrollToSection(amenitiesRef) },
        { label: "Detailed Bookings", onClick: () => scrollToSection(tableRef) },
      ]}
    >
      <div style={styles.pageContainer}>
        <h1 style={styles.pageTitle}>Reports</h1>

        {/* Control Bar */}
        <div style={styles.controlBar}>
          {/* Filters */}
          <div style={styles.filtersContainer}>
            <div style={styles.filterItem}>
              <label style={styles.label}>Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                style={styles.smallInput}
              />
            </div>
            <div style={styles.filterItem}>
              <label style={styles.label}>End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                style={styles.smallInput}
              />
            </div>
            <div style={styles.filterItem}>
              <label style={styles.label}>User Type</label>
              <select
                value={filters.userType}
                onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
                style={styles.smallSelect}
              >
                <option>All</option>
                <option>Customer</option>
                <option>Admin</option>
                <option>SuperAdmin</option>
              </select>
            </div>
            <div style={styles.filterItem}>
              <label style={styles.label}>Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                style={styles.smallSelect}
              >
                <option>All</option>
                <option>Pending</option>
                <option>Confirmed</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>
          {/* Buttons */}
          <div style={styles.buttonsContainer}>
            <button style={styles.primaryButton} onClick={handleGenerate}>Generate</button>
            <button style={styles.secondaryButton} onClick={exportPDF}>Export PDF</button>
            <button style={styles.secondaryButton} onClick={exportExcel}>Export Excel</button>
          </div>
        </div>

        {/* Summary Cards */}
        {report && (
          <div style={styles.cardsContainer}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Total Bookings</h3>
              <p style={styles.cardValue}>{report.totalBookings}</p>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Total Revenue</h3>
              <p style={styles.cardValue}>₱{report.totalRevenue}</p>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Occupancy Rate</h3>
              <p style={styles.cardValue}>{report.occupancyRate.toFixed(2)}%</p>
            </div>
          </div>
        )}

        {/* Revenue Chart */}
        {report?.monthlyReport && (
          <div ref={revenueRef} style={styles.chartSection}>
            <h2 style={styles.chartTitle}>Revenue by Month</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.monthlyReport} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />
                <XAxis dataKey="month" tickLine={false} style={styles.axisText} />
                <YAxis tickLine={false} style={styles.axisText} />
                <Tooltip contentStyle={styles.tooltip} />
                <Legend />
                <Bar dataKey="revenue" fill="#007bff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bookings Trend */}
        {report?.monthlyReport && (
          <div ref={bookingsTrendRef} style={styles.chartSection}>
            <h2 style={styles.chartTitle}>Bookings Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={report.monthlyReport} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />
                <XAxis dataKey="month" style={styles.axisText} />
                <YAxis style={styles.axisText} />
                <Tooltip contentStyle={styles.tooltip} />
                <Legend />
                <Line type="monotone" dataKey="bookings" stroke="#17a2b8" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Amenities Usage */}
        {report?.amenityReport && (
          <div ref={amenitiesRef} style={styles.chartSection}>
            <h2 style={styles.chartTitle}>Amenities Usage</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.amenityReport} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />
                <XAxis dataKey="amenity" style={styles.axisText} />
                <YAxis style={styles.axisText} />
                <Tooltip contentStyle={styles.tooltip} />
                <Bar dataKey="count" fill="#6f42c1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detailed Bookings Table */}
        {report && (
          <div ref={tableRef} style={styles.tableContainer}>
            <h2 style={styles.tableTitle}>Detailed Bookings</h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Room</th>
                  <th style={styles.th}>Total Price</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.bookings.map(b => (
                  <tr key={b.id} style={styles.tableRow}>
                    <td style={styles.td}>{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td style={styles.td}>{b.user?.name || "N/A"}</td>
                    <td style={styles.td}>{b.room?.name || "N/A"}</td>
                    <td style={styles.td}>₱{b.totalPrice}</td>
                    <td style={styles.td}>{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

// ================= Styles ===================

const styles = {
  pageContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px 30px',
    fontFamily: `'Helvetica Neue', Helvetica, Arial, sans-serif`,
    backgroundColor: '#f8f9fa',
  },
  pageTitle: {
    fontSize: '2.75rem',
    fontWeight: 700,
    marginBottom: '20px',
    color: '#212529',
    textAlign: 'center',
  },

  // Control bar styling
  controlBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '15px',
    marginBottom: '30px',
    padding: '10px 15px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },

  // Filters container
  filtersContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },

  filterItem: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '120px',
  },

  label: {
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '4px',
    color: '#495057',
  },

  smallInput: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #ced4da',
    fontSize: '0.85rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },

  smallSelect: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #ced4da',
    fontSize: '0.85rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },

  // Buttons container
  buttonsContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center', // vertical alignment
  },

  primaryButton: {
    padding: '8px 16px',
    height: '40px',
    minWidth: '100px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    transition: 'background-color 0.2s, box-shadow 0.2s',
  },

  secondaryButton: {
    padding: '8px 16px',
    height: '40px',
    minWidth: '120px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    transition: 'background-color 0.2s, box-shadow 0.2s',
  },

  // Cards styling
  cardsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '40px',
    justifyContent: 'center',
  },

  card: {
    flex: '1 1 200px',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.07)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },

  cardTitle: {
    fontSize: '1rem',
    marginBottom: '10px',
    fontWeight: 600,
    color: '#212529',
  },

  cardValue: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: '#212529',
  },

  // Chart styles
  chartSection: {
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.07)',
    marginBottom: '30px',
  },

  chartTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    marginBottom: '15px',
    color: '#212529',
  },

  axisText: {
    fontSize: '0.85rem',
    fill: '#495057',
  },

  tooltip: {
    fontSize: '0.85rem',
  },

  // Table styles
  tableContainer: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.07)',
    marginBottom: '40px',
  },

  tableTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    marginBottom: '15px',
    color: '#212529',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: `'Helvetica Neue', Helvetica, Arial, sans-serif`,
  },

  th: {
    padding: '12px',
    backgroundColor: '#f1f1f1',
    fontWeight: 600,
    fontSize: '0.9rem',
    borderBottom: '1px solid #dee2e6',
    textAlign: 'left',
    color: '#212529',
  },

  td: {
    padding: '12px',
    borderBottom: '1px solid #dee2e6',
    fontSize: '0.85rem',
    color: '#495057',
  },

  tableRow: {
    transition: 'background-color 0.2s',
  },
};