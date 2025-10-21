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
        alert('Active model updated!');
        fetchModels(); // Refresh the list
      } else {
        alert('Failed to update active model');
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
              {!model.isActive && (
                <button onClick={() => setActiveModel(model.id)} className="set-active-btn">
                  Set Active
                </button>
              )}
              <a
                href={model.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="download-btn"
              >
                📥 Download
              </a>
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
  return (
    <div className="logs-tab">
      <h2 className="logs-title">System Logs & Monitoring</h2>
      <div className="coming-soon">
        <div className="coming-soon-icon">📝</div>
        <div className="coming-soon-title">System Logs Coming Soon</div>
        <div className="coming-soon-subtitle">Error tracking and performance monitoring will be available here</div>
      </div>
      
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
        .coming-soon {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
          color: #9ca3af;
        }
        .coming-soon-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        .coming-soon-title {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }
        .coming-soon-subtitle {
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

// Maintenance Tab Component
function MaintenanceTab() {
  return (
    <div className="maintenance-tab">
      <h2 className="maintenance-title">System Maintenance</h2>
      <div className="coming-soon">
        <div className="coming-soon-icon">🔄</div>
        <div className="coming-soon-title">Maintenance Tools Coming Soon</div>
        <div className="coming-soon-subtitle">Cache management and system cleanup tools will be available here</div>
      </div>
      
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
        .coming-soon {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
          color: #9ca3af;
        }
        .coming-soon-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        .coming-soon-title {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }
        .coming-soon-subtitle {
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
