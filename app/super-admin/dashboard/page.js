'use client';
import { useEffect, useState, useRef } from "react";
import { signOut, useSession } from 'next-auth/react';
import SuperAdminLayout from "@/components/SuperAdminLayout";
import Loading, { ButtonLoading } from '@/components/Loading';
import { 
  Calendar, Users, TrendingUp, BarChart3, Building2, Clock, CheckCircle, AlertCircle,
  FileText, Download, Filter, Search, ChevronLeft, ChevronRight, TableIcon as Table, XCircle,
  TableIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend, LineChart, Line, Area, AreaChart
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useNavigationGuard } from '../../../hooks/useNavigationGuard.simple';
import { NavigationConfirmationModal } from '../../../components/CustomModals';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  
  const formatByKey = (p) => {
    const key = p.dataKey || (p.name || '').toString().toLowerCase();
    const val = p.value;
    if (key === 'revenue' || key.toString().includes('revenue')) {
      return typeof val === 'number' ? '₱' + val.toLocaleString() : val;
    }
    if (key === 'bookings' || key === 'count' || key.toString().includes('booking') || key.toString().includes('count')) {
      return typeof val === 'number' ? val.toLocaleString() : val;
    }
    return typeof val === 'number' ? val.toLocaleString() : val;
  };

  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.95)', 
      padding: '12px 16px', 
      borderRadius: '8px', 
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)', 
      border: '1px solid #e5e7eb',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px', fontWeight: '600' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: p.color || '#667eea', borderRadius: '2px' }} />
          <span style={{ fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
            {p.name}: {formatByKey(p)}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend, trendValue }) {
  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: '12px',
      padding: '1rem',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      minHeight: '120px',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.12)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0) scale(1)';
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
    }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem'
      }}>
        <div style={{
          background: color,
          borderRadius: '8px',
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={18} color="white" />
        </div>
        {trend && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
            color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280'
          }}>
            <span>{trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      
      <h3 style={{
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 0.5rem 0',
        letterSpacing: '0.3px',
      }}>
        {title}
      </h3>
      
      <p style={{
        fontSize: '1.75rem',
        fontWeight: '700',
        color: typeof color === 'string' && color.includes('gradient') ? '#1f2937' : color,
        margin: 0,
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        lineHeight: '1.2',
      }}>
        {value}
      </p>
      
      {/* Decorative background element */}
      <div style={{
        position: 'absolute',
        top: -10,
        right: -10,
        width: 40,
        height: 40,
        background: `${typeof color === 'string' && color.includes('gradient') ? color : color}20`,
        borderRadius: '50%',
        zIndex: 0,
      }} />
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    totalRevenue: 0,
    occupancyRate: 0,
    availableRooms: 0
  });
  const [report, setReport] = useState(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [filters, setFilters] = useState({ userType: "All", status: "All" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [amenityView, setAmenityView] = useState('optional');

  // Logout Navigation Guard
  const navigationGuard = useNavigationGuard({
    shouldPreventNavigation: () => true,
    onNavigationAttempt: () => {
      console.log('Super Admin Dashboard: Navigation attempt detected, showing logout confirmation');
    },
    customAction: () => signOut({ callbackUrl: '/login' }),
    context: 'logout',
    message: 'Are you sure you want to log out of your Super Admin dashboard?'
  });

  useEffect(() => {
    fetchDashboardStats();
    handleGenerateReport();
    
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth > 768 && window.innerWidth <= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  async function fetchDashboardStats() {
    try {
      console.log('Dashboard: Fetching stats...');
      const res = await fetch('/api/bookings?limit=1000');
      const data = await res.json();
      
      console.log('Dashboard: API response received:', {
        hasBookings: !!data.bookings,
        bookingsCount: data.bookings?.length || 0,
        hasPagination: !!data.pagination,
        responseKeys: Object.keys(data)
      });
      
      const bookingsData = data.bookings || data;
      
      if (!Array.isArray(bookingsData)) {
        console.error('Invalid bookings data format for dashboard:', data);
        setStats({ total: 0, confirmed: 0, pending: 0, cancelled: 0, totalRevenue: 0, occupancyRate: 0, availableRooms: 0 });
        setIsLoading(false);
        return;
      }
      
      const total = data.pagination?.totalBookings || bookingsData.length;
      const confirmed = bookingsData.filter((b) => b.status === 'Confirmed').length;
      const pending = bookingsData.filter((b) => b.status === 'Pending').length;
      const cancelled = bookingsData.filter((b) => b.status === 'Cancelled').length;
      
      // Calculate additional stats
      const totalRevenue = bookingsData
        .filter(b => b.status === 'Confirmed')
        .reduce((sum, booking) => sum + (parseFloat(booking.totalPrice) || 0), 0);
      
      const occupancyRate = total > 0 ? (confirmed / total) * 100 : 0;
      const availableRooms = 25 - Math.floor(occupancyRate / 4); // Simulated available rooms
      
      console.log('Dashboard: Calculated stats:', { total, confirmed, pending, cancelled, totalRevenue, occupancyRate, availableRooms });
      setStats({ total, confirmed, pending, cancelled, totalRevenue, occupancyRate, availableRooms });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setStats({ total: 0, confirmed: 0, pending: 0, cancelled: 0, totalRevenue: 0, occupancyRate: 0, availableRooms: 0 });
    } finally {
      setIsLoading(false);
    }
  }

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
      console.error(err);
      return null;
    }
  }

  const handleGenerateReport = async () => {
    setIsReportsLoading(true);
    setCurrentPage(1);
    const data = await fetchReport(
      dateRange.start,
      dateRange.end,
      filters.userType,
      filters.status
    );
    if (data) setReport(data);
    setIsReportsLoading(false);
  };

  const formatCurrency = (amount) => {
    let numAmount = 0;
    
    if (typeof amount === 'string') {
      const cleanAmount = amount.replace(/[₱,\s]/g, '');
      numAmount = parseFloat(cleanAmount) || 0;
    } else if (typeof amount === 'number') {
      numAmount = amount;
    } else {
      numAmount = 0;
    }
    
    if (numAmount > 100000) {
      numAmount = numAmount / 100;
    }
    
    return `₱${numAmount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Helper function to format room information
  const formatRoomInfo = (booking) => {
    if (!booking.rooms || booking.rooms.length === 0) return "N/A";
    
    // Group rooms by type and sum quantities
    const roomsByType = booking.rooms.reduce((acc, bookingRoom) => {
      const roomType = bookingRoom.room?.type || 'Unknown';
      const quantity = bookingRoom.quantity || 0;
      
      if (!acc[roomType]) {
        acc[roomType] = 0;
      }
      acc[roomType] += quantity;
      return acc;
    }, {});
    
    // Format as "Type (qty), Type (qty)"
    return Object.entries(roomsByType)
      .map(([type, qty]) => `${type} (${qty})`)
      .join(', ');
  };

  // Filter bookings based on search term
  const filteredBookings = report?.bookings?.filter(booking => {
    const searchLower = searchTerm.toLowerCase();
    const roomInfo = formatRoomInfo(booking).toLowerCase();
    return (
      booking.user?.name?.toLowerCase().includes(searchLower) ||
      roomInfo.includes(searchLower) ||
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
    doc.text("Dashboard Report", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [["Date", "Customer", "Rooms", "Total Price", "Status"]],
      body: filteredBookings.map(b => [
        new Date(b.createdAt).toLocaleDateString(),
        b.user?.name || "N/A",
        formatRoomInfo(b),
        formatCurrency(b.totalPrice),
        b.status
      ]),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [0, 123, 255], textColor: 255, fontStyle: 'bold' },
    });
    doc.save("dashboard-report.pdf");
  };

  const exportExcel = () => {
    if (!filteredBookings?.length) return;
    const ws = XLSX.utils.json_to_sheet(filteredBookings.map(b => ({
      Date: new Date(b.createdAt).toLocaleDateString(),
      Customer: b.user?.name || "N/A",
      "Rooms": formatRoomInfo(b),
      "Total Price": formatCurrency(b.totalPrice),
      Status: b.status,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, "dashboard-report.xlsx");
  };

  if (isLoading) {
    return (
      <SuperAdminLayout activePage="dashboard" user={session?.user}>
        <Loading 
          fullPage={true} 
          text="Loading dashboard..." 
          size="large"
        />
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout activePage="dashboard" user={session?.user}>
      <div style={{
        padding: isMobile ? '0.75rem' : isTablet ? '1rem 1.25rem' : '1.5rem 2rem',
        background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
        minHeight: '100vh',
      }}>
        {/* Header */}
        <div style={{ marginBottom: isMobile ? '1rem' : '2rem' }}>
          <h1 style={{
            fontSize: isMobile ? '1.75rem' : isTablet ? '2rem' : '2.5rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            color: '#fff',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}>
            Dashboard Overview
          </h1>
          <p style={{ 
            fontSize: isMobile ? '0.9rem' : '1.1rem', 
            color: 'rgba(255,255,255,0.9)', 
            lineHeight: '1.5' 
          }}>
            Comprehensive analytics and real-time booking management with integrated reports
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile 
            ? '1fr' 
            : isTablet 
              ? 'repeat(auto-fit, minmax(250px, 1fr))' 
              : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: isMobile ? '1rem' : '1.5rem',
          marginBottom: isMobile ? '1rem' : '2rem',
        }}>
          <StatCard title="Total Bookings" value={stats.total} color="#4A90E2" icon={BarChart3} />
          <StatCard title="Confirmed" value={stats.confirmed} color="#7ED321" icon={CheckCircle} />
          <StatCard title="Pending" value={stats.pending} color="#FEBE52" icon={Clock} />
          <StatCard title="Cancelled" value={stats.cancelled} color="#D0021B" icon={XCircle} />
          <StatCard 
            title="Total Revenue" 
            value={formatCurrency(stats.totalRevenue)} 
            color="#10b981" 
            icon={() => <span style={{fontSize: '24px', fontWeight: 'bold'}}>₱</span>}
            trend="up"
            trendValue="+8%"
          />
          <StatCard 
            title="Occupancy Rate" 
            value={`${stats.occupancyRate.toFixed(1)}%`} 
            color="#f59e0b" 
            icon={TrendingUp}
            trend="up"
            trendValue="+5%"
          />
          <StatCard 
            title="Available Rooms" 
            value={stats.availableRooms} 
            color="#8b5cf6" 
            icon={Building2}
            trend="neutral"
            trendValue="Updated"
          />
        </div>

        {/* Key Metrics Dashboard */}
        {report && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            marginBottom: isMobile ? '1rem' : '1.5rem'
          }}>
            {/* TRevPAR */}
            <div style={{
              background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
              borderRadius: '10px',
              padding: '1rem',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '100px'
            }}>
              <div style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                width: '50px',
                height: '50px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%'
              }} />
              <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.4rem' }}>
                TRevPAR
              </div>
              <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '0.2rem' }}>
                {formatCurrency(report.totalRevenue)}
              </div>
              <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                <span style={{ color: '#10b981' }}>↗ +13%</span> vs previous
              </div>
            </div>

            {/* Occupancy Rate Enhanced */}
            <div style={{
              background: 'white',
              borderRadius: '10px',
              padding: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              border: '1px solid #e5e7eb',
              minHeight: '100px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.4rem' }}>
                Occupancy Rate
              </div>
              <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.2rem' }}>
                {report.occupancyRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                <span style={{ color: '#10b981' }}>↗ +5%</span> vs previous
              </div>
            </div>

            {/* Average Length of Stay */}
            <div style={{
              background: 'white',
              borderRadius: '10px',
              padding: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              border: '1px solid #e5e7eb',
              minHeight: '100px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.4rem' }}>
                Avg Length of Stay
              </div>
              <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.2rem' }}>
                3.5
              </div>
              <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                <span style={{ color: '#f59e0b' }}>→ +10%</span> vs previous
              </div>
            </div>

            {/* GOPPAR */}
            <div style={{
              background: 'white',
              borderRadius: '10px',
              padding: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              border: '1px solid #e5e7eb',
              minHeight: '100px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.4rem' }}>
                GOPPAR
              </div>
              <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.2rem' }}>
                {(report.totalRevenue * 0.189 / 1000).toFixed(1)}k
              </div>
              <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                <span style={{ color: '#10b981' }}>↗ +7%</span> vs previous
              </div>
            </div>

            {/* Booking Lead Time */}
            <div style={{
              background: 'white',
              borderRadius: '10px',
              padding: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              border: '1px solid #e5e7eb',
              minHeight: '100px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.4rem' }}>
                Booking Lead Time
              </div>
              <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.2rem' }}>
                32
              </div>
              <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                <span style={{ color: '#10b981' }}>↗ +10%</span> vs previous
              </div>
            </div>

            {/* Cancellation Rate */}
            <div style={{
              background: 'white',
              borderRadius: '10px',
              padding: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              border: '1px solid #e5e7eb',
              minHeight: '100px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.4rem' }}>
                Cancellation Rate
              </div>
              <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.2rem' }}>
                5.9%
              </div>
              <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                <span style={{ color: '#ef4444' }}>↗ +2%</span> vs previous
              </div>
            </div>
          </div>
        )}

        {/* Reports Section - Control Panel */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: isMobile ? '1rem' : '1.5rem 2rem',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          marginBottom: isMobile ? '1rem' : '2rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <Filter size={20} style={{ color: '#667eea' }} />
            <h3 style={{
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              Reports & Analytics Controls
            </h3>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
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
                  padding: '0.5rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
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
                  padding: '0.5rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
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
                  padding: '0.5rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  background: 'white'
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
                  padding: '0.5rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  background: 'white'
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
              onClick={handleGenerateReport}
              disabled={isReportsLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: isReportsLoading ? '#9ca3af' : 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: isReportsLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isReportsLoading ? (
                <ButtonLoading size="small" color="#ffffff" />
              ) : (
                <BarChart3 size={16} />
              )}
              {isReportsLoading ? 'Generating...' : 'Generate Report'}
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
                opacity: !report?.bookings?.length ? 0.5 : 1
              }}
            >
              <Download size={16} />
              Export Excel
            </button>
          </div>
        </div>

        {/* Charts */}
        {report && (
          <>
            {/* Revenue Chart */}
            {report?.monthlyReport && (
              <div style={{
                background: 'rgba(255,255,255,0.95)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                padding: isMobile ? '1rem' : '2rem',
                marginBottom: isMobile ? '1rem' : '2rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.5rem'
                }}>
                  <BarChart3 size={24} style={{ color: '#febe52' }} />
                  <h2 style={{
                    fontSize: isMobile ? '1.2rem' : '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    Revenue Trend
                  </h2>
                </div>
                
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <BarChart data={report.monthlyReport}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" fill="#febe52" radius={[4, 4, 0, 0]} />
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
                padding: isMobile ? '1rem' : '2rem',
                marginBottom: isMobile ? '1rem' : '2rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.5rem'
                }}>
                  <TrendingUp size={24} style={{ color: '#10b981' }} />
                  <h2 style={{
                    fontSize: isMobile ? '1.2rem' : '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    Bookings Trend
                  </h2>
                </div>
                
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <LineChart data={report.monthlyReport}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Rooms Availed by Month */}
            {report?.monthlyRoomTypeReport && report?.roomTypes?.length > 0 && (
              (() => {
                const latest = report.monthlyRoomTypeReport[report.monthlyRoomTypeReport.length - 1];
                const typeOrder = ['TEPEE','LOFT','VILLA'];
                const presentTypes = typeOrder.filter(t => (report.roomTypes || []).includes(t));
                const displayName = (t) => ({ TEPEE: 'Tepee', LOFT: 'Loft', VILLA: 'Villa' }[t] || t);
                const barData = presentTypes.map(t => ({ type: displayName(t), count: latest?.[t] || 0 }));
                const total = barData.reduce((s, d) => s + d.count, 0);
                return (
                  <div style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(10px)',
                    padding: isMobile ? '1rem' : '2rem',
                    marginBottom: isMobile ? '1rem' : '2rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <BarChart3 size={24} style={{ color: '#f59e0b' }} />
                      <h2 style={{ 
                        fontSize: isMobile ? '1.2rem' : '1.5rem', 
                        fontWeight: '700', 
                        color: '#1f2937', 
                        margin: 0 
                      }}>
                        Rooms Availed by Type
                      </h2>
                    </div>
                    <div style={{ color: '#6b7280', marginBottom: '1rem' }}>for {latest?.month || ''}</div>
                    <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
                      <BarChart data={barData} margin={{ top: 20, right: 40, left: 40, bottom: 40 }}>
                        <defs>
                          <linearGradient id="gradRooms" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EBB307" />
                            <stop offset="100%" stopColor="#febe52" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="type" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <Tooltip content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null;
                          const val = payload[0].value || 0;
                          const pct = total ? Math.round((val / total) * 100) : 0;
                          return (
                            <div style={{ 
                              background: 'rgba(255,255,255,0.95)', 
                              padding: '12px 16px', 
                              borderRadius: 8, 
                              boxShadow: '0 8px 32px rgba(0,0,0,0.15)', 
                              border: '1px solid #e5e7eb' 
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ width: 10, height: 10, background: payload[0].color, borderRadius: 2 }} />
                                <div style={{ fontWeight: 600 }}>{val}</div>
                                <div style={{ color: '#6b7280' }}>({pct}%)</div>
                              </div>
                            </div>
                          );
                        }} />
                        <Bar dataKey="count" fill="url(#gradRooms)" radius={[4,4,0,0]} maxBarSize={80} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()
            )}

            {/* Amenities Usage with Toggle */}
            {(report?.optionalAmenityReport || report?.rentalAmenityReport) && (
              <div style={{
                background: 'rgba(255,255,255,0.95)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                padding: isMobile ? '1rem' : '2rem',
                marginBottom: isMobile ? '1rem' : '2rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Users size={24} style={{ color: '#8b5cf6' }} />
                    <h2 style={{ 
                      fontSize: isMobile ? '1.2rem' : '1.5rem', 
                      fontWeight: '700', 
                      color: '#1f2937', 
                      margin: 0 
                    }}>
                      Amenities Usage
                    </h2>
                  </div>
                  {/* Toggle Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setAmenityView('optional')} 
                      style={{
                        padding: '0.5rem 1rem', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: amenityView === 'optional' ? '#febe52' : '#ffffff',
                        color: amenityView === 'optional' ? '#ffffff' : '#374151', 
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: isMobile ? '0.75rem' : '0.875rem'
                      }}
                    >
                      Optional
                    </button>
                    <button 
                      onClick={() => setAmenityView('rental')} 
                      style={{
                        padding: '0.5rem 1rem', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: amenityView === 'rental' ? '#febe52' : '#ffffff',
                        color: amenityView === 'rental' ? '#ffffff' : '#374151', 
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: isMobile ? '0.75rem' : '0.875rem'
                      }}
                    >
                      Rental
                    </button>
                  </div>
                </div>
                
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
                  <BarChart data={(amenityView === 'optional' ? report.optionalAmenityReport : report.rentalAmenityReport) || []} margin={{ top: 20, right: 40, left: 40, bottom: 60 }}>
                    <defs>
                      <linearGradient id="gradAmenity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EBB307" />
                        <stop offset="100%" stopColor="#febe52" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="amenity" 
                      tick={{ fontSize: isMobile ? 9 : 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip content={<CustomTooltip />} />
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
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              padding: isMobile ? '1rem' : '2rem',
              marginBottom: isMobile ? '1rem' : '2rem'
            }}>
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
                  <Table size={24} style={{ color: '#667eea' }} />
                  <h2 style={{
                    fontSize: isMobile ? '1.2rem' : '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    Recent Bookings
                  </h2>
                </div>

                <div style={{ position: 'relative', minWidth: isMobile ? '200px' : '250px' }}>
                  <Search 
                    size={18} 
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
                      padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              {/* Results Info and Items Per Page */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: '#6b7280',
                flexWrap: 'wrap',
                gap: '0.5rem'
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
                      <th style={{ padding: isMobile ? '0.5rem' : '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                        Date
                      </th>
                      <th style={{ padding: isMobile ? '0.5rem' : '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                        Customer
                      </th>
                      <th style={{ padding: isMobile ? '0.5rem' : '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                        Rooms
                      </th>
                      <th style={{ padding: isMobile ? '0.5rem' : '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                        Total Price
                      </th>
                      <th style={{ padding: isMobile ? '0.5rem' : '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBookings.length > 0 ? currentBookings.map((booking, index) => (
                      <tr key={booking.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ padding: isMobile ? '0.5rem' : '1rem', fontSize: '0.875rem', color: '#374151' }}>
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: isMobile ? '0.5rem' : '1rem', fontSize: '0.875rem', color: '#374151' }}>
                          {booking.user?.name || "N/A"}
                        </td>
                        <td style={{ padding: isMobile ? '0.5rem' : '1rem', fontSize: '0.875rem', color: '#374151' }}>
                          {formatRoomInfo(booking)}
                        </td>
                        <td style={{ padding: isMobile ? '0.5rem' : '1rem', fontSize: '0.875rem', fontWeight: '600', color: '#059669', textAlign: 'right' }}>
                          {formatCurrency(booking.totalPrice)}
                        </td>
                        <td style={{ padding: isMobile ? '0.5rem' : '1rem', textAlign: 'center' }}>
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
                        <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                          {searchTerm ? 'No bookings match your search.' : 'No bookings found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Enhanced Pagination */}
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
          </>
        )}

        {/* Loading state for reports */}
        {isReportsLoading && (
          <Loading 
            overlay={true}
            text="Generating reports and analytics..."
            size="large"
          />
        )}

        {/* Logout Confirmation Modal */}
        <NavigationConfirmationModal 
          show={navigationGuard.showModal}
          onStay={navigationGuard.handleStay}
          onLeave={navigationGuard.handleLeave}
          context="logout"
          message={navigationGuard.message}
        />

        {/* Responsive Styles */}
        <style jsx>{`
          @media (max-width: 1024px) {
            div[style*="gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'"] {
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
            
            div[style*="minWidth: '250px'"] {
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
            
            p[style*="fontSize: '2rem'"] {
              font-size: 1.5rem !important;
            }
            
            /* Stack filter controls vertically on very small screens */
            div[style*="repeat(auto-fit, minmax(200px, 1fr))"] {
              grid-template-columns: 1fr !important;
            }
            
            input[style*="padding: '0.5rem'"],
            select[style*="padding: '0.5rem'"] {
              padding: 0.4rem !important;
            }
          }
        `}</style>
      </div>
    </SuperAdminLayout>
  );
}