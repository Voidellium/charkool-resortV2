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
      let url = 'http://localhost:3000/api/reports';
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
      console.log("✅ Report Data:", data);
      return data;
    } catch (err) {
      console.error("❌ Failed to fetch report:", err);
      alert("❌ Failed to load report. Please try again later.");
      return null;
    }
  }

  const handleGenerate = async () => {
    const data = await fetchReport(dateRange.start, dateRange.end, filters.userType, filters.status);
    if (data) setReport(data);
  };

  const exportPDF = () => {
    if (!report?.bookings?.length) return;
    const doc = new jsPDF();
    doc.text("Booking Report", 14, 16);

    autoTable(doc, {
      head: [["Date", "Customer", "Room", "Total Price", "Status"]],
      body: report.bookings.map(b => [
        new Date(b.createdAt).toLocaleDateString(),
        b.user?.name || "N/A",
        b.room?.name || "N/A",
        "₱" + b.totalPrice,
        b.status
      ]),
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
      <h1>Reports</h1>

      {/* Filters */}
      <div style={{ marginBottom: "20px" }}>
        <label>Start Date:</label>
        <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
        <label style={{ marginLeft: "10px" }}>End Date:</label>
        <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
        <label style={{ marginLeft: "10px" }}>User Type:</label>
        <select value={filters.userType} onChange={e => setFilters({...filters, userType: e.target.value})}>
          <option value="All">All</option>
          <option value="Customer">Customer</option>
          <option value="Admin">Admin</option>
          <option value="SuperAdmin">SuperAdmin</option>
        </select>
        <label style={{ marginLeft: "10px" }}>Status:</label>
        <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button onClick={handleGenerate} style={{ marginLeft: "10px" }}>Generate</button>
      </div>

      {/* Summary Cards */}
      {report && (
        <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
          <div style={cardStyle}><h3>Total Bookings</h3><p>{report.totalBookings}</p></div>
          <div style={cardStyle}><h3>Total Revenue</h3><p>₱{report.totalRevenue}</p></div>
          <div style={cardStyle}><h3>Occupancy Rate</h3><p>{report.occupancyRate.toFixed(2)}%</p></div>
        </div>
      )}

      {/* Revenue Chart */}
      {report?.monthlyReport && (
        <div ref={revenueRef} style={chartContainerStyle}>
          <h2>Revenue by Month</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.monthlyReport}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Export Buttons */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={exportPDF} style={{ marginRight: "10px" }}>Export PDF</button>
        <button onClick={exportExcel}>Export Excel</button>
      </div>

      {/* Bookings Trend */}
      {report?.monthlyReport && (
        <div ref={bookingsTrendRef} style={chartContainerStyle}>
          <h2>Bookings Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.monthlyReport}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="bookings" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Amenities Usage */}
      {report?.amenityReport && (
        <div ref={amenitiesRef} style={chartContainerStyle}>
          <h2>Amenities Usage</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.amenityReport}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="amenity" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#ff8042" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Bookings Table */}
      {report && (
        <div ref={tableRef}>
          <h2>Detailed Bookings</h2>
          <table border="1" cellPadding="10" style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Room</th>
                <th>Total Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.bookings.map(b => (
                <tr key={b.id}>
                  <td>{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td>{b.user?.name || "N/A"}</td>
                  <td>{b.room?.name || "N/A"}</td>
                  <td>₱{b.totalPrice}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SuperAdminLayout>
  );
}

// Reusable style
const cardStyle = { padding: "15px", border: "1px solid #ccc", borderRadius: "10px", background: "#fff" };
const chartContainerStyle = { background: "#fff", padding: "20px", borderRadius: "10px", marginBottom: "20px" };
