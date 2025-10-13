  'use client';
  import { useState, useEffect } from 'react';
  import { ChevronDown, FileText, Clock, Eye, Shield } from 'lucide-react';

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
      <div style={{
        width: '100%',
        padding: '2.5rem 1.25rem',
        background: 'linear-gradient(135deg, #FEBE52 0%, #F3EAC4 100%)',
        minHeight: '100vh'
      }}>
        {/* Header Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem',
          background: 'rgba(255,255,255,0.9)',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          maxWidth: '800px',
          margin: '0 auto 3rem auto'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'linear-gradient(135deg, #febe52 20%, #f7e9afff 100%)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '25px',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}>
            <Shield size={18} />
            TERMS & POLICIES
          </div>
          
          <h2 style={{
            color: '#1f2937',
            fontSize: '2.5rem',
            fontWeight: '700',
            margin: '0 0 1rem 0',
            background: 'linear-gradient(135deg, #febe52 0%, #f7e9afff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: '1.2'
          }}>
            Our Policies & Guidelines
          </h2>
          
          <p style={{
            color: '#6b7280',
            fontSize: '1.1rem',
            margin: 0,
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Please review our terms and policies to understand your rights and responsibilities during your stay with us.
          </p>
        </div>

        {isLoading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '300px',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #febe52',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '1rem'
            }} />
            <p style={{
              fontSize: '1.1rem',
              color: '#6b7280',
              margin: 0,
              fontWeight: '500'
            }}>
              Loading policies...
            </p>
          </div>
        ) : policies.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <FileText size={48} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#374151',
              margin: '0 0 0.5rem 0'
            }}>
              No Policies Available
            </h3>
            <p style={{
              color: '#6b7280',
              margin: 0
            }}>
              There are currently no active policies to display.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {policies.map((policy, index) => (
              <div key={policy.id} style={{
                background: 'rgba(255,255,255,0.95)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(255,255,255,0.2)',
                animation: `slideInUp 0.4s ease-out ${index * 0.1}s both`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
              }}
              >
                {/* Policy Header */}
                <button
                  onClick={() => togglePolicy(policy.id)}
                  aria-expanded={openPolicies.has(policy.id)}
                  style={{
                    width: '100%',
                    padding: '1.5rem 2rem',
                    background: openPolicies.has(policy.id) 
                      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                      : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.3s ease',
                    borderBottom: openPolicies.has(policy.id) ? '1px solid rgba(102, 126, 234, 0.2)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!openPolicies.has(policy.id)) {
                      e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!openPolicies.has(policy.id)) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #febe52 0%, #f7e9afff 100%)',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                    }}>
                      <FileText size={20} color="white" />
                    </div>
                    
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <h3 style={{
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: '0 0 0.25rem 0',
                        lineHeight: '1.3'
                      }}>
                        {policy.title}
                      </h3>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}>
                        <Eye size={14} />
                        <span>Click to {openPolicies.has(policy.id) ? 'collapse' : 'expand'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronDown
                    size={24}
                    style={{
                      color: '#6b7280',
                      transform: openPolicies.has(policy.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  />
                </button>
                
                {/* Policy Content */}
                <div style={{
                  maxHeight: openPolicies.has(policy.id) ? '1000px' : '0',
                  overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: openPolicies.has(policy.id) ? 1 : 0
                }}>
                  <div style={{
                    padding: '1.5rem 2rem 2rem 2rem',
                    background: 'rgba(248, 250, 252, 0.5)',
                    borderTop: '1px solid rgba(226, 232, 240, 0.5)'
                  }}>
                    <div style={{
                      color: '#4b5563',
                      lineHeight: '1.7',
                      fontSize: '1rem',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {policy.content}
                    </div>
                    
                    {/* Last Updated */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '1.5rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid rgba(226, 232, 240, 0.5)',
                      color: '#9ca3af',
                      fontSize: '0.875rem'
                    }}>
                      <Clock size={14} />
                      <span>Last updated: {new Date(policy.updatedAt || policy.createdAt).toLocaleDateString()}</span>
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