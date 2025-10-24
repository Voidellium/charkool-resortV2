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
            background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(254, 190, 84, 0.2);
            border-top: 3px solid #FEBE54;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
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
        <div className="error-message">⚠️ Access Denied - Developer role required</div>
        <style jsx>{`
          .error-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0b3a4a;
          }
          .error-message {
            color: #dc2626;
            font-size: 18px;
            font-weight: 600;
            padding: 24px 32px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
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
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          color: #0b3a4a;
          font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .header {
          background: linear-gradient(135deg, #FEBE54 0%, #EBD591 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 4px 16px rgba(254, 190, 84, 0.15);
        }
        .header-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 72px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .header-title {
          font-size: 24px;
          font-weight: 700;
          color: #0b3a4a;
          letter-spacing: -0.5px;
        }
        .welcome-text {
          color: #123238;
          font-weight: 500;
          font-size: 15px;
        }
        .logout-btn {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
        }
        .logout-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.3);
        }
        .main-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 32px 24px;
        }
        .tab-container {
          display: flex;
          gap: 8px;
          background: white;
          padding: 6px;
          border-radius: 14px;
          margin-bottom: 32px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }
        .tab-button {
          flex: 1;
          padding: 16px 20px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.25s ease;
          font-size: 15px;
          font-weight: 600;
        }
        .tab-button:hover {
          color: #0b3a4a;
          background: rgba(254, 190, 84, 0.1);
        }
        .tab-button.active {
          background: linear-gradient(135deg, #FEBE54 0%, #EBD591 100%);
          color: #0b3a4a;
          box-shadow: 0 4px 12px rgba(254, 190, 84, 0.25);
        }
        .tab-content {
          text-align: center;
        }
        .tab-label {
          font-size: 18px;
          margin-bottom: 6px;
        }
        .tab-description {
          font-size: 12px;
          opacity: 0.85;
        }
        .content-area {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
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
        <div className="loader-spinner"></div>
        <p>Loading models...</p>
        <style jsx>{`
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 2rem;
            color: #6b7280;
            font-size: 1rem;
          }
          .loader-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(254, 190, 84, 0.2);
            border-top: 3px solid #FEBE54;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <div className="error-icon">❌</div>
        <div className="error-title">Error loading models</div>
        <div className="error-message">{error}</div>
        <button onClick={fetchModels} className="retry-btn">
          🔄 Retry
        </button>
        <style jsx>{`
          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 2rem;
            text-align: center;
          }
          .error-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          .error-title {
            color: #dc2626;
            font-weight: 700;
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
          }
          .error-message {
            color: #6b7280;
            font-size: 0.95rem;
            margin-bottom: 1.5rem;
            max-width: 500px;
          }
          .retry-btn {
            background: linear-gradient(135deg, #FEBE54 0%, #EBD591 100%);
            color: #0b3a4a;
            border: none;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s ease;
            box-shadow: 0 4px 12px rgba(254, 190, 84, 0.25);
          }
          .retry-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(254, 190, 84, 0.35);
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
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid rgba(254, 190, 84, 0.2);
        }
        .models-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0b3a4a;
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
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          background: linear-gradient(135deg, #FEBE54 0%, #EBD591 100%);
          color: #0b3a4a;
          text-decoration: none;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(254, 190, 84, 0.25);
          font-size: 0.95rem;
        }
        .upload-btn:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(254, 190, 84, 0.35);
        }
        .upload-btn.disabled {
          background: #d1d5db;
          color: #6b7280;
          cursor: not-allowed;
          box-shadow: none;
        }
        .models-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        .model-card {
          padding: 1.5rem;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          background: #f9fafb;
          transition: all 0.25s ease;
        }
        .model-card:hover {
          border-color: #FEBE54;
          box-shadow: 0 8px 24px rgba(254, 190, 84, 0.15);
          transform: translateY(-2px);
        }
        .model-card.active {
          border-color: #10b981;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%);
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);
        }
        .model-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          gap: 1rem;
        }
        .model-name {
          font-weight: 700;
          color: #0b3a4a;
          margin: 0;
          font-size: 1.1rem;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .active-badge {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          font-size: 0.7rem;
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-weight: 700;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
          text-transform: uppercase;
        }
        .model-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 8px;
        }
        .detail-item {
          font-size: 0.9rem;
          color: #4b5563;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .model-description {
          font-size: 0.9rem;
          color: #374151;
          margin: 1rem 0;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          border-left: 3px solid #FEBE54;
        }
        .model-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .status-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 200px;
        }
        .status-label {
          font-size: 0.9rem;
          color: #374151;
          font-weight: 600;
        }
        .status-select {
          flex: 1;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          border: 2px solid transparent;
          outline: none;
        }
        .status-select.active-select {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
        .status-select.inactive-select {
          background: #e5e7eb;
          color: #6b7280;
          border-color: #d1d5db;
        }
        .status-select:hover {
          transform: translateY(-1px);
        }
        .status-select:focus {
          box-shadow: 0 0 0 3px rgba(254, 190, 84, 0.3);
        }
        .action-buttons {
          display: flex;
          gap: 0.75rem;
        }
        .download-btn {
          padding: 10px 14px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 500;
          transition: all 0.25s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        }
        .download-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
        }
        .delete-btn {
          padding: 10px 14px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }
        .delete-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.35);
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
          padding: 4rem 2rem;
          text-align: center;
          color: #6b7280;
        }
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          opacity: 0.5;
        }
        .empty-title {
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
          color: #374151;
          font-weight: 600;
        }
        .empty-subtitle {
          font-size: 1rem;
          color: #6b7280;
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
        <div className="loader-spinner"></div>
        <p>Loading logs...</p>
        <style jsx>{`
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 2rem;
            color: #6b7280;
          }
          .loader-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(254, 190, 84, 0.2);
            border-top: 3px solid #FEBE54;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
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
          font-size: 1.75rem;
          font-weight: 700;
          color: #0b3a4a;
          margin: 0 0 2rem 0;
          padding-bottom: 1rem;
          border-bottom: 2px solid rgba(254, 190, 84, 0.2);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          padding: 1.5rem;
          border-radius: 12px;
          background: white;
          border: 2px solid #e5e7eb;
          transition: all 0.25s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
        }
        .stat-card.error {
          border-color: #ef4444;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%);
        }
        .stat-card.warning {
          border-color: #f59e0b;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%);
        }
        .stat-card.info {
          border-color: #FEBE54;
          background: linear-gradient(135deg, rgba(254, 190, 84, 0.08) 0%, rgba(254, 190, 84, 0.02) 100%);
        }
        .stat-card.trend {
          border-color: #10b981;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%);
        }
        .stat-icon {
          font-size: 2rem;
          margin-bottom: 0.75rem;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #0b3a4a;
          margin-bottom: 0.5rem;
        }
        .stat-label {
          font-size: 0.9rem;
          color: #6b7280;
          font-weight: 500;
        }
        .filters-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .filter-group label {
          font-size: 0.9rem;
          color: #374151;
          font-weight: 600;
        }
        .filter-group select,
        .filter-group input {
          padding: 10px 14px;
          border-radius: 8px;
          background: white;
          color: #0b3a4a;
          border: 1px solid #d1d5db;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        .filter-group select:focus,
        .filter-group input:focus {
          outline: none;
          border-color: #FEBE54;
          box-shadow: 0 0 0 3px rgba(254, 190, 84, 0.15);
        }
        .search-group {
          flex: 1;
          min-width: 200px;
        }
        .search-group input {
          width: 100%;
        }
        .refresh-btn,
        .cleanup-btn {
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .refresh-btn {
          background: linear-gradient(135deg, #FEBE54 0%, #EBD591 100%);
          color: #0b3a4a;
        }
        .refresh-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(254, 190, 84, 0.25);
        }
        .cleanup-btn {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }
        .cleanup-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }
        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .log-item {
          padding: 1.25rem;
          background: white;
          border-radius: 10px;
          border-left: 4px solid #d1d5db;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .log-item:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          transform: translateX(2px);
        }
        .log-item.resolved {
          opacity: 0.6;
          background: #f9fafb;
        }
        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          gap: 1rem;
        }
        .log-meta {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .log-level {
          font-weight: 700;
          font-size: 0.9rem;
        }
        .log-category {
          padding: 0.35rem 0.75rem;
          background: #f3f4f6;
          border-radius: 6px;
          font-size: 0.8rem;
          color: #374151;
          font-weight: 600;
          border: 1px solid #e5e7eb;
        }
        .log-timestamp {
          font-size: 0.8rem;
          color: #6b7280;
        }
        .resolved-badge {
          padding: 0.35rem 0.75rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
        }
        .log-actions {
          display: flex;
          gap: 0.5rem;
        }
        .expand-btn,
        .resolve-btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .expand-btn {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
        }
        .expand-btn:hover {
          background: #e5e7eb;
        }
        .resolve-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
        }
        .resolve-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
        }
        .log-message {
          color: #0b3a4a;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .log-endpoint {
          font-size: 0.8rem;
          color: #6b7280;
          font-family: 'Monaco', 'Courier New', monospace;
          background: #f9fafb;
          padding: 0.5rem;
          border-radius: 4px;
          margin-top: 0.5rem;
        }
        .log-details {
          margin-top: 1.25rem;
          padding-top: 1.25rem;
          border-top: 2px solid #e5e7eb;
        }
        .log-details > div {
          margin-bottom: 1rem;
          font-size: 0.9rem;
          color: #374151;
        }
        .log-details strong {
          color: #0b3a4a;
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }
        .log-details pre {
          background: #1f2937;
          color: #e5e7eb;
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          font-size: 0.8rem;
          margin-top: 0.5rem;
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1.5rem;
          margin-top: 2rem;
          padding: 1.5rem;
        }
        .page-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #FEBE54 0%, #EBD591 100%);
          color: #0b3a4a;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(254, 190, 84, 0.2);
        }
        .page-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(254, 190, 84, 0.35);
        }
        .page-btn:disabled {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
        }
        .page-info {
          color: #374151;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          color: #6b7280;
        }
        .empty-icon {
          font-size: 3.5rem;
          margin-bottom: 1.5rem;
          opacity: 0.5;
        }
        .empty-title {
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
          color: #374151;
          font-weight: 600;
        }
        .empty-subtitle {
          font-size: 1rem;
          color: #6b7280;
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
        <div className="loader-spinner"></div>
        <p>Loading maintenance stats...</p>
        <style jsx>{`
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 2rem;
            color: #6b7280;
          }
          .loader-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(254, 190, 84, 0.2);
            border-top: 3px solid #FEBE54;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
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
          font-size: 1.75rem;
          font-weight: 700;
          color: #0b3a4a;
          margin: 0 0 2rem 0;
          padding-bottom: 1rem;
          border-bottom: 2px solid rgba(254, 190, 84, 0.2);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          padding: 1.5rem;
          border-radius: 12px;
          background: white;
          border: 2px solid #e5e7eb;
          transition: all 0.25s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(254, 190, 84, 0.15);
          border-color: #FEBE54;
        }
        .stat-icon {
          font-size: 2rem;
          margin-bottom: 0.75rem;
        }
        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0b3a4a;
          margin-bottom: 0.5rem;
        }
        .stat-label {
          font-size: 0.9rem;
          color: #6b7280;
          font-weight: 500;
        }
        .actions-section,
        .details-section {
          margin-bottom: 2rem;
          padding: 1.75rem;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }
        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0b3a4a;
          margin: 0 0 1.25rem 0;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          gap: 1rem;
        }
        .action-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }
        .action-btn {
          padding: 14px 20px;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        .action-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        }
        .cache-btn {
          background: linear-gradient(135deg, #FEBE54 0%, #EBD591 100%);
          color: #0b3a4a;
        }
        .preview-btn {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }
        .clean-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        .scan-btn {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }
        .detail-card {
          padding: 1.25rem;
          background: #f9fafb;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
        }
        .detail-card:hover {
          border-color: #FEBE54;
        }
        .detail-label {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
          font-weight: 500;
        }
        .detail-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0b3a4a;
          margin-bottom: 0.5rem;
        }
        .detail-note {
          font-size: 0.8rem;
          color: #9ca3af;
        }
        .storage-breakdown {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .storage-item {
          display: grid;
          grid-template-columns: 150px 1fr 110px;
          align-items: center;
          gap: 1.25rem;
        }
        .storage-label {
          font-size: 0.95rem;
          color: #374151;
          font-weight: 600;
        }
        .storage-bar {
          height: 28px;
          background: #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
        }
        .storage-fill {
          height: 100%;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .storage-fill.uploads {
          background: linear-gradient(90deg, #FEBE54, #EBD591);
        }
        .storage-fill.models {
          background: linear-gradient(90deg, #8b5cf6, #7c3aed);
        }
        .storage-fill.images {
          background: linear-gradient(90deg, #10b981, #059669);
        }
        .storage-value {
          font-size: 0.9rem;
          color: #0b3a4a;
          font-weight: 600;
          text-align: right;
        }
        .orphaned-files-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 350px;
          overflow-y: auto;
        }
        .orphaned-file {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
        }
        .orphaned-file:hover {
          border-color: #d1d5db;
          background: white;
        }
        .file-name {
          font-size: 0.9rem;
          color: #374151;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }
        .file-info {
          display: flex;
          gap: 1.25rem;
          font-size: 0.8rem;
          color: #6b7280;
          font-weight: 500;
        }
        .file-date {
          color: #9ca3af;
        }
        .more-files {
          text-align: center;
          padding: 1rem;
          color: #6b7280;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .delete-orphaned-btn {
          padding: 10px 18px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }
        .delete-orphaned-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.35);
        }
        .delete-orphaned-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        .records-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }
        .record-item {
          display: flex;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        .record-item:hover {
          border-color: #FEBE54;
          background: white;
        }
        .record-item span {
          color: #6b7280;
          font-weight: 500;
        }
        .record-item strong {
          color: #0b3a4a;
          font-weight: 700;
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