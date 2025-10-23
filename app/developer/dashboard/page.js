"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function DeveloperDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('models');

  // Simple role-based authentication check
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== "DEVELOPER") {
      router.push('/unauthorized');
      return;
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            background: #111827;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 2px solid #3b82f6;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!session || session.user?.role !== "DEVELOPER") {
    return (
      <div className="error-container">
        <div className="error-message">Access Denied - Developer role required</div>
        <style jsx>{`
          .error-container {
            min-height: 100vh;
            background: #111827;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .error-message {
            color: #ef4444;
            font-size: 18px;
          }
        `}</style>
      </div>
    );
  }

  const tabs = [
    { id: 'models', label: '🎨 3D Models', description: 'Manage resort 3D models' },
    { id: 'logs', label: '📝 System Logs', description: 'View system errors & performance' },
    { id: 'maintenance', label: '🔄 Maintenance', description: 'Cache & system cleanup' }
  ];

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-title">
              🛠️ Developer Dashboard
            </div>
            <div className="welcome-text">
              Welcome, {session.user?.firstName}
            </div>
          </div>
          <button
            onClick={() => router.push('/api/auth/signout')}
            className="logout-btn"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="main-content">
        <div className="tab-container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <div className="tab-content">
                <div className="tab-label">{tab.label}</div>
                <div className="tab-description">{tab.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="content-area">
          {activeTab === 'models' && <ModelsTab />}
          {activeTab === 'logs' && <LogsTab />}
          {activeTab === 'maintenance' && <MaintenanceTab />}
        </div>
      </div>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          background: #111827;
          color: white;
          font-family: Arial, sans-serif;
        }
        .header {
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }
        .header-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .header-title {
          font-size: 20px;
          font-weight: bold;
          color: #60a5fa;
        }
        .welcome-text {
          color: #9ca3af;
        }
        .logout-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .logout-btn:hover {
          background: #b91c1c;
        }
        .main-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 24px 16px;
        }
        .tab-container {
          display: flex;
          gap: 4px;
          background: #1f2937;
          padding: 4px;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .tab-button {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          font-weight: 500;
        }
        .tab-button:hover {
          color: white;
          background: #374151;
        }
        .tab-button.active {
          background: #2563eb;
          color: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .tab-content {
          text-align: center;
        }
        .tab-label {
          font-size: 18px;
          margin-bottom: 4px;
        }
        .tab-description {
          font-size: 12px;
          opacity: 0.75;
        }
        .content-area {
          background: #1f2937;
          border-radius: 8px;
          padding: 24px;
        }
      `}</style>
    </div>
  );
}

// 3D Models Tab Component
function ModelsTab() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const fetchModels = async () => {
    try {
      setError(null);
      const response = await fetch('/api/developer/models');
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Please check your login status');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Only show the wholemap_spearated_texture model
      if (Array.isArray(data)) {
        const filteredModels = data.filter(model => 
          model.fileName && model.fileName.toLowerCase().includes('wholemap_separated_textured')
        );
        setModels(filteredModels);
      } else {
        console.error('API returned non-array data:', data);
        setModels([]);
        setError('Invalid data format received from server');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setError(error.message);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Only allow wholemap_separated_textured files
    const fileName = file.name.toLowerCase();
    if (!fileName.includes('wholemap_separated_textured')) {
      alert('Please upload only the wholemap_separated_textured model file');
      return;
    }

    // Validate file type
    const validTypes = ['.gltf', '.glb'];
    const fileExt = fileName.substring(fileName.lastIndexOf('.'));
    if (!validTypes.includes(fileExt)) {
      alert('Please upload only GLTF (.gltf, .glb) files');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/developer/models/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Model uploaded successfully!');
        fetchModels(); // Refresh the list
      } else {
        const error = await response.text();
        alert(`Upload failed: ${error}`);
      }
    } catch (error) {
      alert(`Upload error: ${error.message}`);
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const setActiveModel = async (modelId) => {
    try {
      const response = await fetch('/api/developer/models/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      });

      if (response.ok) {
        alert('Model set to active!');
        fetchModels(); // Refresh the list
      } else {
        alert('Failed to update active model');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const setInactiveModel = async (modelId) => {
    try {
      const response = await fetch('/api/developer/models/set-inactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      });

      if (response.ok) {
        alert('Model set to inactive!');
        fetchModels(); // Refresh the list
      } else {
        alert('Failed to set model inactive');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const deleteModel = async (modelId, modelName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${modelName}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      const response = await fetch('/api/developer/models/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      });

      if (response.ok) {
        alert('Model deleted successfully!');
        fetchModels(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Failed to delete model: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        Loading models...
        <style jsx>{`
          .loading-state {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: #9ca3af;
            font-size: 1rem;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <div className="error-icon">❌ Error loading models</div>
        <div className="error-message">{error}</div>
        <button onClick={fetchModels} className="retry-btn">
          Retry
        </button>
        <style jsx>{`
          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            text-align: center;
          }
          .error-icon {
            color: #ef4444;
            margin-bottom: 1rem;
            font-size: 1.125rem;
          }
          .error-message {
            color: #9ca3af;
            font-size: 0.875rem;
            margin-bottom: 1rem;
          }
          .retry-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          .retry-btn:hover {
            background: #1d4ed8;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="models-tab">
      <div className="models-header">
        <h2 className="models-title">3D Model Management</h2>
        <div className="upload-section">
          <input
            type="file"
            accept=".gltf,.glb"
            onChange={handleFileUpload}
            disabled={uploading}
            className="file-input"
            id="model-upload"
          />
          <label htmlFor="model-upload" className={`upload-btn ${uploading ? 'disabled' : ''}`}>
            {uploading ? 'Uploading...' : '📁 Upload Model'}
          </label>
        </div>
      </div>

      <div className="models-grid">
        {(models || []).map((model) => (
          <div key={model.id} className={`model-card ${model.isActive ? 'active' : ''}`}>
            <div className="model-header">
              <h3 className="model-name">{model.name}</h3>
              {model.isActive && (
                <span className="active-badge">ACTIVE</span>
              )}
            </div>
            
            <div className="model-details">
              <div className="detail-item">📁 {model.fileName}</div>
              <div className="detail-item">🏷️ {model.fileType}</div>
              <div className="detail-item">
                📏 {model.fileSize ? `${(model.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
              </div>
              <div className="detail-item">📅 {new Date(model.createdAt).toLocaleDateString()}</div>
            </div>

            {model.description && (
              <div className="model-description">
                {model.description}
              </div>
            )}

            <div className="model-actions">
              <div className="status-controls">
                <label className="status-label">Status:</label>
                <select
                  value={model.isActive ? 'active' : 'inactive'}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    if (newStatus === 'active' && !model.isActive) {
                      setActiveModel(model.id);
                    } else if (newStatus === 'inactive' && model.isActive) {
                      setInactiveModel(model.id);
                    }
                  }}
                  className={`status-select ${model.isActive ? 'active-select' : 'inactive-select'}`}
                >
                  <option value="active">✅ Active</option>
                  <option value="inactive">⭕ Inactive</option>
                </select>
              </div>
              <div className="action-buttons">
                <a
                  href={model.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="download-btn"
                  title="Download model"
                >
                  📥
                </a>
                <button
                  onClick={() => deleteModel(model.id, model.name)}
                  className="delete-btn"
                  title="Delete model"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(!models || models.length === 0) && !error && (
        <div className="empty-state">
          <div className="empty-icon">🎨</div>
          <div className="empty-title">No wholemap_separated_textured models found</div>
          <div className="empty-subtitle">Upload your wholemap_separated_textured GLTF model to get started</div>
        </div>
      )}

      <style jsx>{`
        .models-tab {
          width: 100%;
        }
        .models-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .models-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          margin: 0;
        }
        .upload-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .file-input {
          display: none;
        }
        .upload-btn {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          background: #2563eb;
          color: white;
          text-decoration: none;
          border: none;
          display: inline-block;
        }
        .upload-btn:hover:not(.disabled) {
          background: #1d4ed8;
        }
        .upload-btn.disabled {
          background: #4b5563;
          color: #9ca3af;
          cursor: not-allowed;
        }
        .models-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        .model-card {
          padding: 1rem;
          border-radius: 0.5rem;
          border: 2px solid #4b5563;
          background: rgba(55, 65, 81, 0.5);
          transition: all 0.2s;
        }
        .model-card.active {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.2);
        }
        .model-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .model-name {
          font-weight: 600;
          color: white;
          margin: 0;
          font-size: 1rem;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .active-badge {
          background: #10b981;
          color: white;
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-weight: 500;
        }
        .model-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }
        .detail-item {
          font-size: 0.875rem;
          color: #9ca3af;
        }
        .model-description {
          font-size: 0.875rem;
          color: #d1d5db;
          margin: 0.5rem 0;
          padding: 0.5rem;
          background: rgba(75, 85, 99, 0.5);
          border-radius: 0.375rem;
        }
        .model-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          align-items: center;
        }
        .status-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }
        .status-label {
          font-size: 0.875rem;
          color: #d1d5db;
          font-weight: 500;
        }
        .status-select {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
          outline: none;
        }
        .status-select.active-select {
          background: #10b981;
          color: white;
          border-color: #059669;
        }
        .status-select.inactive-select {
          background: #6b7280;
          color: white;
          border-color: #4b5563;
        }
        .status-select:hover {
          opacity: 0.9;
        }
        .status-select:focus {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
        }
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .download-btn {
          padding: 0.5rem 0.75rem;
          background: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
        }
        .download-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
        }
        .delete-btn {
          padding: 0.5rem 0.75rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
        }
        .delete-btn:hover {
          background: #dc2626;
          transform: translateY(-2px);
        }
        .set-active-btn {
          flex: 1;
          background: #2563eb;
          color: white;
          border: none;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .set-active-btn:hover {
          background: #1d4ed8;
        }
        .download-btn {
          padding: 0.5rem 0.75rem;
          background: #4b5563;
          color: white;
          text-decoration: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        .download-btn:hover {
          background: #6b7280;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
          color: #9ca3af;
        }
        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        .empty-title {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }
        .empty-subtitle {
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

// System Logs Tab Component
function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    level: 'ALL',
    category: 'ALL',
    resolved: 'ALL',
    search: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0
  });

  const fetchLogs = async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });

      const response = await fetch(`/api/developer/logs?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/developer/logs/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [pagination.page, filters]);

  const resolveLog = async (logId) => {
    try {
      const response = await fetch('/api/developer/logs/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId })
      });

      if (response.ok) {
        alert('Log marked as resolved!');
        fetchLogs();
        fetchStats();
      } else {
        alert('Failed to resolve log');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const cleanupOldLogs = async () => {
    if (!confirm('Delete all logs older than 5 days? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/developer/logs/cleanup', {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchLogs();
        fetchStats();
      } else {
        alert('Failed to cleanup logs');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return '#ef4444';
      case 'WARNING': return '#f59e0b';
      case 'INFO': return '#3b82f6';
      case 'DEBUG': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'ERROR': return '🔴';
      case 'WARNING': return '⚠️';
      case 'INFO': return 'ℹ️';
      case 'DEBUG': return '🔧';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        Loading logs...
        <style jsx>{`
          .loading-state {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: #9ca3af;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="logs-tab">
      <h2 className="logs-title">System Logs & Monitoring</h2>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card error">
            <div className="stat-icon">🔴</div>
            <div className="stat-value">{stats.unresolvedErrors}</div>
            <div className="stat-label">Unresolved Errors</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">{stats.unresolvedWarnings}</div>
            <div className="stat-label">Unresolved Warnings</div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.todayLogs}</div>
            <div className="stat-label">Logs Today</div>
          </div>
          <div className="stat-card trend">
            <div className="stat-icon">�</div>
            <div className="stat-value">{stats.trendPercentage > 0 ? '+' : ''}{stats.trendPercentage}%</div>
            <div className="stat-label">Trend</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Level:</label>
          <select
            value={filters.level}
            onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          >
            <option value="ALL">All</option>
            <option value="ERROR">Error</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
            <option value="DEBUG">Debug</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="ALL">All</option>
            <option value="API">API</option>
            <option value="AUTH">Auth</option>
            <option value="PAYMENT">Payment</option>
            <option value="DATABASE">Database</option>
            <option value="UPLOAD">Upload</option>
            <option value="BOOKING">Booking</option>
            <option value="SYSTEM">System</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.resolved}
            onChange={(e) => setFilters({ ...filters, resolved: e.target.value })}
          >
            <option value="ALL">All</option>
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
          </select>
        </div>

        <div className="filter-group search-group">
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <button onClick={() => fetchLogs()} className="refresh-btn">
          🔄 Refresh
        </button>

        <button onClick={cleanupOldLogs} className="cleanup-btn">
          🗑️ Cleanup Old
        </button>
      </div>

      {/* Logs List */}
      <div className="logs-list">
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✨</div>
            <div className="empty-title">No logs found</div>
            <div className="empty-subtitle">Try adjusting your filters</div>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`log-item ${log.resolved ? 'resolved' : ''}`}
              style={{ borderLeftColor: getLevelColor(log.level) }}
            >
              <div className="log-header">
                <div className="log-meta">
                  <span className="log-level" style={{ color: getLevelColor(log.level) }}>
                    {getLevelIcon(log.level)} {log.level}
                  </span>
                  <span className="log-category">{log.category}</span>
                  <span className="log-timestamp">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  {log.resolved && (
                    <span className="resolved-badge">✅ Resolved</span>
                  )}
                </div>
                <div className="log-actions">
                  <button
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    className="expand-btn"
                  >
                    {expandedLog === log.id ? '▼' : '▶'}
                  </button>
                  {!log.resolved && (
                    <button
                      onClick={() => resolveLog(log.id)}
                      className="resolve-btn"
                    >
                      ✓ Resolve
                    </button>
                  )}
                </div>
              </div>

              <div className="log-message">{log.message}</div>

              {log.endpoint && (
                <div className="log-endpoint">📍 {log.endpoint}</div>
              )}

              {expandedLog === log.id && (
                <div className="log-details">
                  {log.stackTrace && (
                    <div className="stack-trace">
                      <strong>Stack Trace:</strong>
                      <pre>{log.stackTrace}</pre>
                    </div>
                  )}
                  {log.user && (
                    <div className="log-user">
                      <strong>User:</strong> {log.user.firstName} {log.user.lastName} ({log.user.email}) - {log.userRole}
                    </div>
                  )}
                  {log.ipAddress && (
                    <div className="log-ip">
                      <strong>IP:</strong> {log.ipAddress}
                    </div>
                  )}
                  {log.metadata && (
                    <div className="log-metadata">
                      <strong>Metadata:</strong>
                      <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="page-btn"
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
          </span>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.totalPages}
            className="page-btn"
          >
            Next →
          </button>
        </div>
      )}
      
      <style jsx>{`
        .logs-tab {
          width: 100%;
        }
        .logs-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          margin: 0 0 1.5rem 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat-card {
          padding: 1rem;
          border-radius: 0.5rem;
          background: rgba(55, 65, 81, 0.5);
          border: 2px solid #4b5563;
        }
        .stat-card.error {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }
        .stat-card.warning {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }
        .stat-card.info {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }
        .stat-card.trend {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }
        .stat-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .stat-value {
          font-size: 1.75rem;
          font-weight: bold;
          color: white;
          margin-bottom: 0.25rem;
        }
        .stat-label {
          font-size: 0.875rem;
          color: #9ca3af;
        }
        .filters-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          padding: 1rem;
          background: rgba(55, 65, 81, 0.5);
          border-radius: 0.5rem;
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .filter-group label {
          font-size: 0.875rem;
          color: #d1d5db;
        }
        .filter-group select,
        .filter-group input {
          padding: 0.5rem;
          border-radius: 0.375rem;
          background: #374151;
          color: white;
          border: 1px solid #4b5563;
          font-size: 0.875rem;
        }
        .search-group {
          flex: 1;
        }
        .search-group input {
          width: 100%;
        }
        .refresh-btn,
        .cleanup-btn {
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .refresh-btn {
          background: #3b82f6;
          color: white;
        }
        .refresh-btn:hover {
          background: #2563eb;
        }
        .cleanup-btn {
          background: #ef4444;
          color: white;
        }
        .cleanup-btn:hover {
          background: #dc2626;
        }
        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .log-item {
          padding: 1rem;
          background: rgba(55, 65, 81, 0.5);
          border-radius: 0.5rem;
          border-left: 4px solid #4b5563;
          transition: all 0.2s;
        }
        .log-item:hover {
          background: rgba(75, 85, 99, 0.5);
        }
        .log-item.resolved {
          opacity: 0.7;
        }
        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .log-meta {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .log-level {
          font-weight: bold;
          font-size: 0.875rem;
        }
        .log-category {
          padding: 0.25rem 0.5rem;
          background: #4b5563;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          color: #d1d5db;
        }
        .log-timestamp {
          font-size: 0.75rem;
          color: #9ca3af;
        }
        .resolved-badge {
          padding: 0.25rem 0.5rem;
          background: #10b981;
          color: white;
          border-radius: 0.25rem;
          font-size: 0.75rem;
        }
        .log-actions {
          display: flex;
          gap: 0.5rem;
        }
        .expand-btn,
        .resolve-btn {
          padding: 0.25rem 0.75rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .expand-btn {
          background: #4b5563;
          color: white;
        }
        .expand-btn:hover {
          background: #6b7280;
        }
        .resolve-btn {
          background: #10b981;
          color: white;
        }
        .resolve-btn:hover {
          background: #059669;
        }
        .log-message {
          color: white;
          margin-bottom: 0.5rem;
          font-size: 0.9375rem;
        }
        .log-endpoint {
          font-size: 0.75rem;
          color: #9ca3af;
          font-family: monospace;
        }
        .log-details {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #4b5563;
        }
        .log-details > div {
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          color: #d1d5db;
        }
        .log-details strong {
          color: white;
          display: block;
          margin-bottom: 0.25rem;
        }
        .log-details pre {
          background: #1f2937;
          padding: 0.75rem;
          border-radius: 0.375rem;
          overflow-x: auto;
          font-size: 0.75rem;
          color: #e5e7eb;
          margin-top: 0.5rem;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
          padding: 1rem;
        }
        .page-btn {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .page-btn:hover:not(:disabled) {
          background: #2563eb;
        }
        .page-btn:disabled {
          background: #4b5563;
          color: #9ca3af;
          cursor: not-allowed;
        }
        .page-info {
          color: #d1d5db;
          font-size: 0.875rem;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
          color: #9ca3af;
        }
        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        .empty-title {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }
        .empty-subtitle {
          font-size: 0.875rem;
        }
        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}

// Maintenance Tab Component
function MaintenanceTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [orphanedFiles, setOrphanedFiles] = useState([]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/developer/maintenance/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const clearCache = async () => {
    if (!confirm('Clear Next.js cache? This is safe and may improve performance.')) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/developer/maintenance/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchStats();
      } else {
        alert('Failed to clear cache');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const cleanDatabase = async (dryRun = false) => {
    if (!dryRun && !confirm('Clean old database records? This will delete expired OTPs, sessions, and old logs.')) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/developer/maintenance/clean-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      });

      if (response.ok) {
        const data = await response.json();
        if (dryRun) {
          alert(`Preview:\n` +
            `- Expired OTPs: ${data.wouldDelete.otps}\n` +
            `- Expired Sessions: ${data.wouldDelete.sessions}\n` +
            `- Old System Logs: ${data.wouldDelete.systemLogs}\n` +
            `- Old Audit Trails: ${data.wouldDelete.auditTrails}`
          );
        } else {
          alert(data.message);
          fetchStats();
        }
      } else {
        alert('Failed to clean database');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const scanOrphanedFiles = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/developer/maintenance/clean-uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true })
      });

      if (response.ok) {
        const data = await response.json();
        setOrphanedFiles(data.orphanedFiles);
        alert(data.message);
      } else {
        alert('Failed to scan for orphaned files');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const deleteOrphanedFiles = async () => {
    if (!confirm(`Delete ${orphanedFiles.length} orphaned files? This cannot be undone.`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/developer/maintenance/clean-uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setOrphanedFiles([]);
        fetchStats();
      } else {
        alert('Failed to delete orphaned files');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        Loading maintenance stats...
        <style jsx>{`
          .loading-state {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: #9ca3af;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="maintenance-tab">
      <h2 className="maintenance-title">System Maintenance & Cache</h2>

      {/* Storage Overview */}
      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💾</div>
              <div className="stat-value">{formatBytes(stats.database.totalSize + stats.files.totalSize)}</div>
              <div className="stat-label">Total Storage</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🗄️</div>
              <div className="stat-value">{formatBytes(stats.database.totalSize)}</div>
              <div className="stat-label">Database</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🖼️</div>
              <div className="stat-value">{formatBytes(stats.files.totalSize)}</div>
              <div className="stat-label">Files</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-value">{formatBytes(stats.cache.nextCache)}</div>
              <div className="stat-label">Next.js Cache</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="actions-section">
            <h3 className="section-title">🧹 Quick Cleanup Actions</h3>
            <div className="action-buttons">
              <button
                onClick={clearCache}
                disabled={processing}
                className="action-btn cache-btn"
              >
                🗑️ Clear Next.js Cache
              </button>
              <button
                onClick={() => cleanDatabase(true)}
                disabled={processing}
                className="action-btn preview-btn"
              >
                🔍 Preview Database Cleanup
              </button>
              <button
                onClick={() => cleanDatabase(false)}
                disabled={processing}
                className="action-btn clean-btn"
              >
                🧹 Clean Database
              </button>
              <button
                onClick={scanOrphanedFiles}
                disabled={processing}
                className="action-btn scan-btn"
              >
                🖼️ Scan Orphaned Files
              </button>
            </div>
          </div>

          {/* Cleanable Data Details */}
          <div className="details-section">
            <h3 className="section-title">📊 Cleanable Data</h3>
            <div className="details-grid">
              <div className="detail-card">
                <div className="detail-label">Expired OTPs</div>
                <div className="detail-value">{stats.database.cleanable.expiredOTPs}</div>
                <div className="detail-note">Older than 24 hours</div>
              </div>
              <div className="detail-card">
                <div className="detail-label">Expired Sessions</div>
                <div className="detail-value">{stats.database.cleanable.expiredSessions}</div>
                <div className="detail-note">Past expiry date</div>
              </div>
              <div className="detail-card">
                <div className="detail-label">Old System Logs</div>
                <div className="detail-value">{stats.database.cleanable.oldSystemLogs}</div>
                <div className="detail-note">Older than 5 days</div>
              </div>
              <div className="detail-card">
                <div className="detail-label">Old Audit Trails</div>
                <div className="detail-value">{stats.database.cleanable.oldAuditTrails}</div>
                <div className="detail-note">Older than 90 days</div>
              </div>
            </div>
          </div>

          {/* Storage Breakdown */}
          <div className="details-section">
            <h3 className="section-title">📁 Storage Breakdown</h3>
            <div className="storage-breakdown">
              <div className="storage-item">
                <div className="storage-label">📤 Uploads</div>
                <div className="storage-bar">
                  <div 
                    className="storage-fill uploads"
                    style={{ width: `${(stats.files.breakdown.uploads / stats.files.totalSize * 100) || 0}%` }}
                  ></div>
                </div>
                <div className="storage-value">{formatBytes(stats.files.breakdown.uploads)}</div>
              </div>
              <div className="storage-item">
                <div className="storage-label">🎨 3D Models</div>
                <div className="storage-bar">
                  <div 
                    className="storage-fill models"
                    style={{ width: `${(stats.files.breakdown.models / stats.files.totalSize * 100) || 0}%` }}
                  ></div>
                </div>
                <div className="storage-value">{formatBytes(stats.files.breakdown.models)}</div>
              </div>
              <div className="storage-item">
                <div className="storage-label">🖼️ Images</div>
                <div className="storage-bar">
                  <div 
                    className="storage-fill images"
                    style={{ width: `${(stats.files.breakdown.images / stats.files.totalSize * 100) || 0}%` }}
                  ></div>
                </div>
                <div className="storage-value">{formatBytes(stats.files.breakdown.images)}</div>
              </div>
            </div>
          </div>

          {/* Orphaned Files List */}
          {orphanedFiles.length > 0 && (
            <div className="details-section">
              <div className="section-header">
                <h3 className="section-title">🗑️ Orphaned Files ({orphanedFiles.length})</h3>
                <button
                  onClick={deleteOrphanedFiles}
                  disabled={processing}
                  className="delete-orphaned-btn"
                >
                  Delete All Orphaned Files
                </button>
              </div>
              <div className="orphaned-files-list">
                {orphanedFiles.slice(0, 10).map((file, index) => (
                  <div key={index} className="orphaned-file">
                    <div className="file-name">📄 {file.name}</div>
                    <div className="file-info">
                      <span>{formatBytes(file.size)}</span>
                      <span className="file-date">
                        {new Date(file.lastModified).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {orphanedFiles.length > 10 && (
                  <div className="more-files">
                    ... and {orphanedFiles.length - 10} more files
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Database Records */}
          <div className="details-section">
            <h3 className="section-title">🗃️ Database Records</h3>
            <div className="records-grid">
              <div className="record-item">
                <span>System Logs:</span>
                <strong>{stats.database.records.systemLogs.toLocaleString()}</strong>
              </div>
              <div className="record-item">
                <span>Audit Trails:</span>
                <strong>{stats.database.records.auditTrails.toLocaleString()}</strong>
              </div>
              <div className="record-item">
                <span>Bookings:</span>
                <strong>{stats.database.records.bookings.toLocaleString()}</strong>
              </div>
              <div className="record-item">
                <span>Payments:</span>
                <strong>{stats.database.records.payments.toLocaleString()}</strong>
              </div>
              <div className="record-item">
                <span>OTPs:</span>
                <strong>{stats.database.records.otps.toLocaleString()}</strong>
              </div>
              <div className="record-item">
                <span>Sessions:</span>
                <strong>{stats.database.records.sessions.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        .maintenance-tab {
          width: 100%;
        }
        .maintenance-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          margin: 0 0 1.5rem 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat-card {
          padding: 1rem;
          border-radius: 0.5rem;
          background: rgba(55, 65, 81, 0.5);
          border: 2px solid #4b5563;
        }
        .stat-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          margin-bottom: 0.25rem;
        }
        .stat-label {
          font-size: 0.875rem;
          color: #9ca3af;
        }
        .actions-section,
        .details-section {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(55, 65, 81, 0.5);
          border-radius: 0.5rem;
        }
        .section-title {
          font-size: 1.125rem;
          font-weight: bold;
          color: white;
          margin: 0 0 1rem 0;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .action-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .action-btn {
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          color: white;
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .cache-btn {
          background: #3b82f6;
        }
        .cache-btn:hover:not(:disabled) {
          background: #2563eb;
        }
        .preview-btn {
          background: #8b5cf6;
        }
        .preview-btn:hover:not(:disabled) {
          background: #7c3aed;
        }
        .clean-btn {
          background: #10b981;
        }
        .clean-btn:hover:not(:disabled) {
          background: #059669;
        }
        .scan-btn {
          background: #f59e0b;
        }
        .scan-btn:hover:not(:disabled) {
          background: #d97706;
        }
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .detail-card {
          padding: 1rem;
          background: rgba(31, 41, 55, 0.5);
          border-radius: 0.375rem;
          border: 1px solid #374151;
        }
        .detail-label {
          font-size: 0.875rem;
          color: #9ca3af;
          margin-bottom: 0.5rem;
        }
        .detail-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          margin-bottom: 0.25rem;
        }
        .detail-note {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .storage-breakdown {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .storage-item {
          display: grid;
          grid-template-columns: 150px 1fr 100px;
          align-items: center;
          gap: 1rem;
        }
        .storage-label {
          font-size: 0.875rem;
          color: #d1d5db;
        }
        .storage-bar {
          height: 24px;
          background: #374151;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }
        .storage-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        .storage-fill.uploads {
          background: linear-gradient(90deg, #3b82f6, #2563eb);
        }
        .storage-fill.models {
          background: linear-gradient(90deg, #8b5cf6, #7c3aed);
        }
        .storage-fill.images {
          background: linear-gradient(90deg, #10b981, #059669);
        }
        .storage-value {
          font-size: 0.875rem;
          color: white;
          font-weight: 500;
          text-align: right;
        }
        .orphaned-files-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 300px;
          overflow-y: auto;
        }
        .orphaned-file {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: rgba(31, 41, 55, 0.5);
          border-radius: 0.375rem;
          border: 1px solid #374151;
        }
        .file-name {
          font-size: 0.875rem;
          color: #d1d5db;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .file-info {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #9ca3af;
        }
        .file-date {
          color: #6b7280;
        }
        .more-files {
          text-align: center;
          padding: 0.5rem;
          color: #9ca3af;
          font-size: 0.875rem;
        }
        .delete-orphaned-btn {
          padding: 0.5rem 1rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .delete-orphaned-btn:hover:not(:disabled) {
          background: #dc2626;
        }
        .delete-orphaned-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .records-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }
        .record-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: rgba(31, 41, 55, 0.5);
          border-radius: 0.375rem;
          border: 1px solid #374151;
          font-size: 0.875rem;
        }
        .record-item span {
          color: #9ca3af;
        }
        .record-item strong {
          color: white;
        }
        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}