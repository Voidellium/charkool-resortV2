  'use client';
  import { useState, useEffect } from 'react';

  export default function PolicyList() {
    const [policies, setPolicies] = useState([]);
    const [openPolicies, setOpenPolicies] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/policies');
        if (!response.ok) {
          throw new Error('Failed to fetch policies');
        }
        const data = await response.json();
        setPolicies(data.filter(p => p.isActive));
      } catch (error) {
        console.error('Failed to fetch policies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const togglePolicy = (id) => {
      setOpenPolicies(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    };

    return (
      <div className="policies-wrapper">
        {isLoading ? (
          <div className="loading-container">
            <p>Loading policies...</p>
          </div>
        ) : (
          <div className="policies-container">
            {policies.map(policy => (
              <div key={policy.id} className="policy-item">
                <div className="policy-card">
                  <button 
                    className="policy-header"
                    onClick={() => togglePolicy(policy.id)}
                    aria-expanded={openPolicies.has(policy.id)}
                  >
                    <span className="policy-title">{policy.title}</span>
                    <span className={`expand-icon ${openPolicies.has(policy.id) ? 'open' : ''}`}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </span>
                  </button>
                  
                  <div className={`policy-content ${openPolicies.has(policy.id) ? 'open' : ''}`}>
                    <div className="content-inner">
                      <p>{policy.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <style jsx>{`
          .policies-wrapper {
            width: 100%;
            padding: 40px 20px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          }

          .policies-header {
            text-align: center;
            margin-bottom: 40px;
          }

          .policies-header h2 {
            color: #0b3a4a;
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
          }

          .policies-header p {
            color: #5a7a7a;
            font-size: 1.1rem;
          }

          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
            font-size: 1.2rem;
            color: #0b3a4a;
          }

          .policies-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 24px;
            max-width: 1400px;
            margin: 0 auto;
            align-items: start;
          }

          .policy-item {
            min-height: 0;
          }

          .policy-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
          }

          .policy-card:hover {
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
            transform: translateY(-2px);
          }

          .policy-header {
            width: 100%;
            padding: 20px 24px;
            background: transparent;
            border: none;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.2s;
          }

          .policy-header:hover {
            background-color: rgba(11, 58, 74, 0.04);
          }

          .policy-title {
            font-weight: 600;
            color: #0b3a4a;
            font-size: 1.05rem;
            text-align: left;
            flex: 1;
          }

          .expand-icon {
            width: 24px;
            height: 24px;
            color: #0b3a4a;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .expand-icon.open {
            transform: rotate(45deg);
          }

          .expand-icon svg {
            width: 100%;
            height: 100%;
          }

          .policy-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .policy-content.open {
            max-height: 500px;
          }

          .content-inner {
            padding: 0 24px 20px;
            color: #4a6a6a;
            line-height: 1.6;
            font-size: 0.95rem;
          }

          .content-inner p {
            margin: 0;
          }

          @media (max-width: 768px) {
            .policies-wrapper {
              padding: 30px 15px;
            }

            .policies-header h2 {
              font-size: 2rem;
            }

            .policies-container {
              grid-template-columns: 1fr;
              gap: 16px;
            }

            .policy-header {
              padding: 16px 20px;
            }

            .policy-title {
              font-size: 1rem;
            }
          }

          @media (min-width: 1200px) {
            .policies-container {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        `}</style>
      </div>
    );
  }