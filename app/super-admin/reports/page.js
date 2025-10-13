'use client';
import { useEffect, useState, useRef } from "react";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import css from './reports.module.css';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend, LineChart, Line 
} from "recharts";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const formatByKey = (p) => {
    // prefer dataKey if available (recharts payload sometimes provides it)
    const key = p.dataKey || (p.name || '').toString().toLowerCase();
    const val = p.value;
    if (key === 'revenue' || key.toString().includes('revenue')) {
      return typeof val === 'number' ? '₱' + val.toLocaleString() : val;
    }
    // bookings and counts are plain numbers
    if (key === 'bookings' || key === 'count' || key.toString().includes('booking') || key.toString().includes('count')) {
      return typeof val === 'number' ? val.toLocaleString() : val;
    }
    // fallback: if number, show with separators
    return typeof val === 'number' ? val.toLocaleString() : val;
  };

  return (
    <div style={{ background: '#fff', padding: 10, borderRadius: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.12)', border: '1px solid #eef2f7' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, background: p.color || '#000', borderRadius: 3 }} />
          <div style={{ fontWeight: 700 }}>{p.name}: </div>
          <div style={{ color: '#111' }}>{formatByKey(p)}</div>
        </div>
      ))}
    </div>
  );
}

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
      "Total Price": "₱" + b.totalPrice,
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
  <div className={css.container}>
  <h1 className={css.centerTitle}>Reports</h1>

        {/* Control Bar */}
  <div className={css.controlBar}>
          {/* Filters */}
          <div className={css.filters}>
            <div className={css.filterItem}>
              <label className={css.label}>Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className={css.smallInput}
              />
            </div>
            <div className={css.filterItem}>
              <label className={css.label}>End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className={css.smallInput}
              />
            </div>
            <div className={css.filterItem}>
              <label className={css.label}>User Type</label>
              <select
                value={filters.userType}
                onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
                className={css.smallSelect}
              >
                <option>All</option>
                <option>Customer</option>
                <option>Admin</option>
                <option>SuperAdmin</option>
              </select>
            </div>
            <div className={css.filterItem}>
              <label className={css.label}>Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className={css.smallSelect}
              >
                <option>All</option>
                <option>Pending</option>
                <option>Confirmed</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>
          {/* Buttons */}
          <div className={css.btnRow}>
            <button className={css.btnPrimary} onClick={handleGenerate}>Generate</button>
            <button className={css.btnSecondary} onClick={exportPDF}>Export PDF</button>
            <button className={css.btnSecondary} onClick={exportExcel}>Export Excel</button>
          </div>
        </div>

        {/* Summary Cards */}
        {report && (
          <div style={styles.cardsContainer}>
              <div className={css.card}>
                <h3 className={css.cardTitle}>Total Bookings</h3>
                <p className={css.cardValue}>{report.totalBookings}</p>
              </div>
              <div className={css.card}>
                <h3 className={css.cardTitle}>Total Revenue</h3>
                <p className={css.cardValue}>₱{report.totalRevenue}</p>
              </div>
              <div className={css.card}>
                <h3 className={css.cardTitle}>Occupancy Rate</h3>
                <p className={css.cardValue}>{report.occupancyRate.toFixed(2)}%</p>
              </div>
          </div>
        )}

        {/* Revenue Chart */}
        {report?.monthlyReport && (
          <div ref={revenueRef} className={css.chartSection}>
            <h2 className={css.chartTitle}>Revenue by Month</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.monthlyReport} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" x2="1">
                    <stop offset="0%" stopColor="#ffb347" />
                    <stop offset="100%" stopColor="#febd52" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="month" tickLine={false} style={styles.axisText} />
                <YAxis tickLine={false} style={styles.axisText} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenue" fill="url(#gradRevenue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bookings Trend */}
        {report?.monthlyReport && (
          <div ref={bookingsTrendRef} className={css.chartSection}>
            <h2 className={css.chartTitle}>Bookings Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={report.monthlyReport} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="month" style={styles.axisText} />
                <YAxis style={styles.axisText} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="bookings" stroke="#06b6d4" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Amenities Usage */}
        {report?.amenityReport && (
          <div ref={amenitiesRef} className={css.chartSection}>
            <h2 className={css.chartTitle}>Amenities Usage</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.amenityReport} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAmenity" x1="0" x2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6f42c1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="amenity" style={styles.axisText} />
                <YAxis style={styles.axisText} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="url(#gradAmenity)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detailed Bookings Table */}
        {report && (
          <div ref={tableRef} className={css.tableWrap}>
            <h2 className={css.tableTitle}>Detailed Bookings</h2>
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