  'use client';
  import { useEffect, useState, useRef } from "react";
  import SuperAdminLayout from "@/components/SuperAdminLayout";
  import css from './reports.module.css';
  import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    CartesianGrid, Legend, LineChart, Line, Area, AreaChart
  } from "recharts";
  import { 
    FileText, Download, Calendar, Users, DollarSign, TrendingUp, 
    ChevronLeft, ChevronRight, Search, Filter, BarChart3, 
    Table as TableIcon, Eye, MoreVertical 
  } from 'lucide-react';

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
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);

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
      setIsLoading(true);
      setCurrentPage(1); // Reset pagination when generating new report
      const data = await fetchReport(
        dateRange.start,
        dateRange.end,
        filters.userType,
        filters.status
      );
      if (data) setReport(data);
      setIsLoading(false);
    };

    // Helper function to format currency properly
    const formatCurrency = (amount) => {
      // Handle various data types and potential issues
      let numAmount = 0;
      
      if (typeof amount === 'string') {
        // Remove any existing currency symbols and commas
        const cleanAmount = amount.replace(/[₱,\s]/g, '');
        numAmount = parseFloat(cleanAmount) || 0;
      } else if (typeof amount === 'number') {
        numAmount = amount;
      } else {
        numAmount = 0;
      }
      
      // If the number seems too large (like stored in centavos), divide by 100
      if (numAmount > 100000) {
        numAmount = numAmount / 100;
      }
      
      return `₱${numAmount.toLocaleString('en-PH', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    };

    // Filter bookings based on search term
    const filteredBookings = report?.bookings?.filter(booking => {
      const searchLower = searchTerm.toLowerCase();
      return (
        booking.user?.name?.toLowerCase().includes(searchLower) ||
        booking.room?.name?.toLowerCase().includes(searchLower) ||
        booking.status.toLowerCase().includes(searchLower) ||
        new Date(booking.createdAt).toLocaleDateString().includes(searchLower)
      );
    }) || [];

    // Pagination logic
    const totalItems = filteredBookings.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentBookings = filteredBookings.slice(startIndex, endIndex);

    const goToPage = (page) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const exportPDF = () => {
      if (!filteredBookings?.length) return;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Booking Report", 14, 20);
      autoTable(doc, {
        startY: 30,
        head: [["Date", "Customer", "Room", "Total Price", "Status"]],
        body: filteredBookings.map(b => [
          new Date(b.createdAt).toLocaleDateString(),
          b.user?.name || "N/A",
          b.room?.name || "N/A",
          formatCurrency(b.totalPrice),
          b.status
        ]),
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [0, 123, 255], textColor: 255, fontStyle: 'bold' },
      });
      doc.save("report.pdf");
    };

    const exportExcel = () => {
      if (!filteredBookings?.length) return;
      const ws = XLSX.utils.json_to_sheet(filteredBookings.map(b => ({
        Date: new Date(b.createdAt).toLocaleDateString(),
        Customer: b.user?.name || "N/A",
        Room: b.room?.name || "N/A",
        "Total Price": formatCurrency(b.totalPrice),
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
      <SuperAdminLayout>
        <div style={{
          width: '100%',
          padding: '2rem 1.5rem',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: '100vh'
        }}>
          {/* Header Section */}
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '25px',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '1rem',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}>
              <BarChart3 size={18} />
              REPORTS & ANALYTICS
            </div>
            
            <h1 style={{
              color: '#1f2937',
              fontSize: '2.5rem',
              fontWeight: '700',
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: '1.2'
            }}>
              Reports and Analytics Dashboard
            </h1>
            
            <p style={{
              color: '#6b7280',
              fontSize: '1.1rem',
              margin: 0,
              lineHeight: '1.6'
            }}>
              Comprehensive analytics and insights for your resort operations
            </p>
          </div>

          {/* Control Panel */}
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            padding: '1.5rem 2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <Filter size={20} style={{ color: '#667eea' }} />
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Filter & Export Controls
              </h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '44px'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '44px'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  User Type
                </label>
                <select
                  value={filters.userType}
                  onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'white',
                    cursor: 'pointer',
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '44px',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '3rem'
                  }}
                >
                  <option>All</option>
                  <option>Customer</option>
                  <option>Admin</option>
                  <option>SuperAdmin</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'white',
                    cursor: 'pointer',
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '44px',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '3rem'
                  }}
                >
                  <option>All</option>
                  <option>Pending</option>
                  <option>Confirmed</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
              >
                <BarChart3 size={16} />
                {isLoading ? 'Generating...' : 'Generate Report'}
              </button>

              <button
                onClick={exportPDF}
                disabled={!report?.bookings?.length}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: '#ffffff',
                  color: '#374151',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: !report?.bookings?.length ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: !report?.bookings?.length ? 0.5 : 1
                }}
              >
                <FileText size={16} />
                Export PDF
              </button>

              <button
                onClick={exportExcel}
                disabled={!report?.bookings?.length}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: '#ffffff',
                  color: '#374151',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: !report?.bookings?.length ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: !report?.bookings?.length ? 0.5 : 1
                }}
              >
                <Download size={16} />
                Export Excel
              </button>
            </div>
          </div>

          {/* Key Metrics Dashboard */}
          {report && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Total Revenue */}
              <div style={{
                background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
                borderRadius: '12px',
                padding: '1.5rem',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%'
                }} />
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                  TRevPAR
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                  {formatCurrency(report.totalRevenue).replace('₱', '₱')}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  <span style={{ color: '#10b981' }}>↗ +13%</span> vs previous period
                </div>
              </div>

              {/* Occupancy Rate */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Occupancy Rate
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                  {report.occupancyRate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  <span style={{ color: '#10b981' }}>↗ +5%</span> vs previous period
                </div>
              </div>

              {/* Average Length of Stay */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Avg Length of Stay
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                  3.5
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  <span style={{ color: '#f59e0b' }}>→ +10%</span> vs previous period
                </div>
              </div>

              {/* GOP PAR */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  GOPPAR
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                  {(report.totalRevenue * 0.189 / 1000).toFixed(1)}k
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  <span style={{ color: '#10b981' }}>↗ +7%</span> vs previous period
                </div>
              </div>

              {/* Booking Lead Time */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Booking Lead Time
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                  32
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  <span style={{ color: '#10b981' }}>↗ +10%</span> vs previous period
                </div>
              </div>

              {/* Cancellation Rate */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Cancellation Rate
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                  5.9%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  <span style={{ color: '#ef4444' }}>↗ +2%</span> vs previous period
                </div>
              </div>
            </div>
          )}

          {/* Charts Grid Layout */}
          {report && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Occupancy Rate Chart */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}>
                  Occupancy Rate
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={report.monthlyReport}>
                    <defs>
                      <linearGradient id="occupancyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis hide />
                    <Tooltip formatter={(value) => [`${value}`, 'Bookings']} />
                    <Area 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fill="url(#occupancyGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue Chart */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}>
                  TRevPAR
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={report.monthlyReport}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis hide />
                    <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                    <Bar 
                      dataKey="revenue" 
                      fill="#10b981" 
                      radius={[2, 2, 0, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Legacy cards for backward compatibility */}
          {report && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
              }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calendar size={24} color="white" />
                  </div>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151',
                    margin: 0
                  }}>
                    Total Bookings
                  </h3>
                </div>
                <p style={{
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: 0,
                  lineHeight: 1
                }}>
                  {report.totalBookings.toLocaleString()}
                </p>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
              }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <DollarSign size={24} color="white" />
                  </div>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151',
                    margin: 0
                  }}>
                    Total Revenue
                  </h3>
                </div>
                <p style={{
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: 0,
                  lineHeight: 1
                }}>
                  {formatCurrency(report.totalRevenue)}
                </p>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
              }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <TrendingUp size={24} color="white" />
                  </div>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151',
                    margin: 0
                  }}>
                    Occupancy Rate
                  </h3>
                </div>
                <p style={{
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: 0,
                  lineHeight: 1
                }}>
                  {report.occupancyRate.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Revenue Chart */}
          {report?.monthlyReport && (
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <BarChart3 size={24} style={{ color: '#febe52' }} />
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: 0
                }}>
                  Revenue by Month
                </h2>
              </div>
              
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={report.monthlyReport.map(item => {
                    const originalRevenue = parseFloat(item.revenue) || 0;
                    const adjustedRevenue = originalRevenue > 100000 ? originalRevenue / 100 : originalRevenue;
                    return {
                      ...item,
                      revenue: adjustedRevenue,
                      originalRevenue: originalRevenue
                    };
                  })} 
                  margin={{ top: 20, right: 60, left: 60, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EBB307" />
                      <stop offset="100%" stopColor="#febe52" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    interval={0}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
                    width={80}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{
                            background: 'rgba(255,255,255,0.95)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                            border: '1px solid #e5e7eb',
                            backdropFilter: 'blur(10px)'
                          }}>
                            <p style={{ 
                              margin: '0 0 8px 0', 
                              fontSize: '14px', 
                              fontWeight: '600',
                              color: '#374151'
                            }}>
                              {label}
                            </p>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                background: payload[0].color,
                                borderRadius: '2px'
                              }} />
                              <span style={{ 
                                fontSize: '14px', 
                                color: '#1f2937',
                                fontWeight: '500'
                              }}>
                                Revenue: {formatCurrency(payload[0].payload.originalRevenue || payload[0].value)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#gradRevenue)" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bookings Trend */}
          {report?.monthlyReport && (
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <TrendingUp size={24} style={{ color: '#10b981' }} />
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: 0
                }}>
                  Bookings Trend
                </h2>
              </div>
              
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={report.monthlyReport} margin={{ top: 20, right: 60, left: 40, bottom: 20 }}>
                  <defs>
                    <linearGradient id="gradBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    interval={0}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    width={60}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{
                            background: 'rgba(255,255,255,0.95)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                            border: '1px solid #e5e7eb',
                            backdropFilter: 'blur(10px)'
                          }}>
                            <p style={{ 
                              margin: '0 0 8px 0', 
                              fontSize: '14px', 
                              fontWeight: '600',
                              color: '#374151'
                            }}>
                              {label}
                            </p>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                background: payload[0].color,
                                borderRadius: '2px'
                              }} />
                              <span style={{ 
                                fontSize: '14px', 
                                color: '#1f2937',
                                fontWeight: '500'
                              }}>
                                Bookings: {payload[0].value}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }} 
                    activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                    fill="url(#gradBookings)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Amenities Usage */}
          {report?.amenityReport && (
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <Users size={24} style={{ color: '#8b5cf6' }} />
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: 0
                }}>
                  Amenities Usage
                </h2>
              </div>
              
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={report.amenityReport} margin={{ top: 20, right: 40, left: 40, bottom: 60 }}>
                  <defs>
                    <linearGradient id="gradAmenity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EBB307" />
                      <stop offset="100%" stopColor="#febe52" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="amenity" 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    width={60}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{
                            background: 'rgba(255,255,255,0.95)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                            border: '1px solid #e5e7eb',
                            backdropFilter: 'blur(10px)'
                          }}>
                            <p style={{ 
                              margin: '0 0 8px 0', 
                              fontSize: '14px', 
                              fontWeight: '600',
                              color: '#374151'
                            }}>
                              {label}
                            </p>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                background: payload[0].color,
                                borderRadius: '2px'
                              }} />
                              <span style={{ 
                                fontSize: '14px', 
                                color: '#1f2937',
                                fontWeight: '500'
                              }}>
                                Usage: {payload[0].value} times
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="url(#gradAmenity)" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Bookings Table */}
          {report && (
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              {/* Table Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <TableIcon size={24} style={{ color: '#667eea' }} />
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    Detailed Bookings
                  </h2>
                </div>

                {/* Search Bar */}
                <div style={{
                  position: 'relative',
                  minWidth: '300px'
                }}>
                  <Search 
                    size={20} 
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>

              {/* Results Info */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                <span>
                  Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} bookings
                  {searchTerm && ` (filtered from ${report.bookings.length} total)`}
                </span>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      background: 'white'
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div style={{
                overflowX: 'auto',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: 'white'
                }}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Date
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Customer
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Room
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Total Price
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBookings.length > 0 ? currentBookings.map((booking, index) => (
                      <tr 
                        key={booking.id} 
                        style={{
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f9fafb'}
                      >
                        <td style={{
                          padding: '1rem',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #f3f4f6'
                        }}>
                          {new Date(booking.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td style={{
                          padding: '1rem',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #f3f4f6'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <Users size={16} style={{ color: '#9ca3af' }} />
                            {booking.user?.name || "N/A"}
                          </div>
                        </td>
                        <td style={{
                          padding: '1rem',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #f3f4f6'
                        }}>
                          {booking.room?.name || "N/A"}
                        </td>
                        <td style={{
                          padding: '1rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#059669',
                          textAlign: 'right',
                          borderBottom: '1px solid #f3f4f6'
                        }}>
                          {formatCurrency(booking.totalPrice)}
                        </td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                          borderBottom: '1px solid #f3f4f6'
                        }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: 
                              booking.status === 'Confirmed' ? '#d1fae5' :
                              booking.status === 'Pending' ? '#fef3c7' :
                              booking.status === 'Cancelled' ? '#fee2e2' : '#f3f4f6',
                            color:
                              booking.status === 'Confirmed' ? '#065f46' :
                              booking.status === 'Pending' ? '#92400e' :
                              booking.status === 'Cancelled' ? '#991b1b' : '#374151'
                          }}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td 
                          colSpan="5" 
                          style={{
                            padding: '3rem',
                            textAlign: 'center',
                            color: '#9ca3af',
                            fontSize: '1rem'
                          }}
                        >
                          {searchTerm ? 'No bookings match your search criteria.' : 'No bookings found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    Page {currentPage} of {totalPages}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.5rem 0.75rem',
                        background: currentPage === 1 ? '#f9fafb' : 'white',
                        color: currentPage === 1 ? '#9ca3af' : '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>

                    {/* Page Numbers */}
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(
                          totalPages - 4,
                          currentPage - 2
                        )) + i;
                        
                        if (pageNum > totalPages) return null;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            style={{
                              padding: '0.5rem 0.75rem',
                              background: pageNum === currentPage ? '#febe52' : 'white',
                              color: pageNum === currentPage ? 'white' : '#374151',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              minWidth: '40px'
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.5rem 0.75rem',
                        background: currentPage === totalPages ? '#f9fafb' : 'white',
                        color: currentPage === totalPages ? '#9ca3af' : '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Responsive Styles */}
        <style jsx>{`
          @media (max-width: 1024px) {
            div[style*="gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'"] {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 1rem !important;
            }
          }
          
          @media (max-width: 768px) {
            div[style*="gridTemplateColumns"] {
              grid-template-columns: 1fr !important;
              gap: 1rem !important;
            }
            
            div[style*="padding: 2rem"] {
              padding: 1rem !important;
            }
            
            div[style*="padding: 1.5rem 2rem"] {
              padding: 1rem 1.5rem !important;
            }
            
            h1[style*="fontSize: '2.5rem'"] {
              font-size: 2rem !important;
            }
            
            div[style*="flexWrap: 'wrap'"] {
              flex-direction: column !important;
              align-items: stretch !important;
            }
            
            div[style*="minWidth: '300px'"] {
              min-width: auto !important;
            }
            
            table {
              font-size: 0.75rem !important;
            }
            
            th, td {
              padding: 0.5rem !important;
            }
            
            div[style*="overflowX: 'auto'"] {
              margin: 0 -1rem;
            }
            
            /* Better button spacing on mobile */
            div[style*="gap: '1rem'"][style*="flexWrap: 'wrap'"] button {
              min-width: 120px !important;
              margin-bottom: 0.5rem !important;
            }
          }
          
          @media (max-width: 480px) {
            div[style*="padding: 1rem"] {
              padding: 0.75rem !important;
            }
            
            div[style*="padding: 1rem 1.5rem"] {
              padding: 0.75rem 1rem !important;
            }
            
            h1[style*="fontSize: '2rem'"] {
              font-size: 1.75rem !important;
            }
            
            p[style*="fontSize: '2.5rem'"] {
              font-size: 1.5rem !important;
            }
            
            /* Stack filter controls vertically on very small screens */
            div[style*="minmax(250px, 1fr)"] {
              grid-template-columns: 1fr !important;
            }
            
            input[style*="minHeight: '44px'"],
            select[style*="minHeight: '44px'"] {
              min-height: 40px !important;
              padding: 0.5rem 0.75rem !important;
            }
            
            select[style*="paddingRight: '3rem'"] {
              padding-right: 2.5rem !important;
            }
          }
        `}</style>
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