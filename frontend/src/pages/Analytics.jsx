import React, { useEffect, useState } from 'react';
import { Download, Filter, FileText, Table as TableIcon, Eye, Image as ImageIcon, Search, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import { useToast } from '../components/common/Toast';

const Analytics = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme.mode === 'dark';

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [inspectionFilter, setInspectionFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/analytics/history?page=${page}&limit=${limit}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (inspectionFilter) url += `&inspection_id=${encodeURIComponent(inspectionFilter)}`;
      if (sourceFilter) url += `&source_type=${sourceFilter}`;
      
      const response = await api.get(url);
      setLogs(response.data.items);
      setTotal(response.data.total);
    } catch (e) {
      console.error('Failed to fetch analytics logs:', e);
      showToast('Failed to sync shift database records', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter, inspectionFilter, sourceFilter]);

  const formatSource = (src) => {
    const map = {
      webcam: 'Laptop Webcam',
      ipcam: 'Mobile IP Camera',
      rtsp: 'RTSP CCTV',
      video: 'Recorded Video',
    };
    return map[src] || src || '—';
  };

  const handleExport = (format) => {
    window.open(`/api/analytics/export/${format}`, '_blank');
    showToast(`Generating platform ${format.toUpperCase()} report...`, 'success', 3000);
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const defectScreenshots = logs.filter(log => log.screenshot_path);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.lg
    }}>
      
      {/* Title + Exports Panel */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
        alignItems: 'flex-start',
        borderBottom: `1px solid ${theme.colors.border}`,
        paddingBottom: theme.spacing.md
      }} className="lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: 800,
            fontFamily: theme.typography.fontFamily.heading,
            color: theme.colors.text.primary,
            margin: 0,
            letterSpacing: '-0.025em'
          }}>
            Shift Quality Audit Logs
          </h1>
          <p style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.text.secondary,
            marginTop: '0.25rem',
            margin: 0
          }}>
            Inspect shift runs, verify camera verdicts, and download CSV/PDF compliance reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.sm, width: '100%' }} className="sm:w-auto">
          <Button
            onClick={() => handleExport('csv')}
            variant="secondary"
            icon={TableIcon}
          >
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('pdf')}
            variant="primary"
            icon={FileText}
          >
            PDF Audit Report
          </Button>
        </div>
      </div>

      {/* Defect photo Visual archives */}
      {defectScreenshots.length > 0 && (
        <Card title="Shift Defect Photo Archives" icon={ImageIcon} padding="lg">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: theme.spacing.sm,
            marginTop: theme.spacing.md
          }} className="sm:grid-cols-3 md:grid-cols-5">
            {defectScreenshots.map((log) => (
              <div 
                key={log.id} 
                style={{
                  position: 'relative',
                  aspectRatio: '16/9',
                  borderRadius: theme.borderRadius.xl,
                  backgroundColor: '#070A13',
                  overflow: 'hidden',
                  border: `1px solid ${theme.colors.border}`,
                  cursor: 'pointer',
                  boxShadow: theme.shadows.sm,
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.borderColor = theme.colors.error;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = theme.colors.border;
                }}
                onClick={() => { setActiveImage(log.screenshot_path); showToast(`Zooming failure frame #${log.id}`, 'info', 1500); }}
              >
                <img 
                  src={log.screenshot_path} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  alt={`Failure item #${log.id}`} 
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  opacity: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.2s ease',
                  zIndex: 5
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
                >
                  <Eye size={18} style={{ color: '#FFFFFF' }} />
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '0.4rem',
                  left: '0.4rem',
                  right: '0.4rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  zIndex: 10,
                  pointerEvents: 'none'
                }}>
                  <span style={{
                    backgroundColor: 'rgba(7, 10, 19, 0.85)',
                    color: '#FFFFFF',
                    fontSize: '8px',
                    fontFamily: theme.typography.fontFamily.mono,
                    padding: '0.1rem 0.35rem',
                    borderRadius: theme.borderRadius.sm,
                    fontWeight: 700
                  }}>
                    #{log.bottle_id}
                  </span>
                  <Badge variant="error" size="small" style={{ fontSize: '7px', padding: '0.05rem 0.25rem' }}>
                    {log.pass_fail}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Primary Log Grid */}
      <Card title="Shift Quality Records Logs" padding="lg">
        
        {/* Filters bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.sm,
          borderBottom: `1px solid ${theme.colors.border}`,
          paddingBottom: theme.spacing.md,
          marginBottom: theme.spacing.md
        }} className="sm:flex-row sm:items-center sm:justify-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} style={{ color: theme.colors.text.secondary }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Query Filters
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs, alignItems: 'center' }}>
            <Input
              placeholder="Session ID e.g. WC001"
              value={inspectionFilter}
              onChange={(e) => { setInspectionFilter(e.target.value); setPage(1); }}
              icon={Search}
              size="small"
              style={{ maxWidth: '160px' }}
            />
            
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1); showToast('Device filter updated', 'info', 1500); }}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: theme.borderRadius.lg,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text.primary,
                fontSize: '0.7rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Sources</option>
              <option value="webcam">Laptop Webcam</option>
              <option value="ipcam">Mobile IP Camera</option>
              <option value="rtsp">RTSP CCTV</option>
              <option value="video">Recorded Video</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); showToast('Verdict filter updated', 'info', 1500); }}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: theme.borderRadius.lg,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text.primary,
                fontSize: '0.7rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Results</option>
              <option value="PASS">Verdict OK</option>
              <option value="FAIL">Verdict FAIL</option>
              <option value="WARNING">Verdict Warning</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: theme.colors.text.tertiary, fontSize: theme.typography.fontSize.xs, fontWeight: 600 }}>
            Querying Shift database archives...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: theme.colors.text.tertiary, fontSize: theme.typography.fontSize.xs, fontWeight: 600 }}>
            No shift logs found matching active parameters.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: theme.typography.fontSize.xs
              }}>
                <thead>
                  <tr style={{
                    borderBottom: `1px solid ${theme.colors.border}`,
                    color: theme.colors.text.secondary,
                    fontSize: '0.675rem',
                    fontFamily: theme.typography.fontFamily.heading,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Log ID</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Session ID</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Source</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Bottle ID</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Fluid Fill</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Labeling</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>AI Confidence</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Verdict</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Screenshot</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    let badgeVariant = "success";
                    if (log.pass_fail === 'FAIL') badgeVariant = "error";
                    if (log.pass_fail === 'WARNING') badgeVariant = "warning";

                    return (
                      <tr 
                        key={log.id} 
                        style={{
                          borderBottom: `1px solid ${theme.colors.border}`,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.colors.surfaceHover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '0.85rem 0.5rem', fontFamily: theme.typography.fontFamily.mono, fontWeight: 700 }}>#{log.id}</td>
                        <td style={{ padding: '0.85rem 0.5rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.primary, fontWeight: 600 }}>{log.inspection_id || '—'}</td>
                        <td style={{ padding: '0.85rem 0.5rem', fontWeight: 500 }}>{formatSource(log.source_type)}</td>
                        <td style={{ padding: '0.85rem 0.5rem', color: theme.colors.text.secondary }}>{new Date(log.timestamp).toLocaleString()}</td>
                        <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, fontFamily: theme.typography.fontFamily.mono }}>#{log.bottle_id}</td>
                        <td style={{ padding: '0.85rem 0.5rem', textTransform: 'capitalize', fontWeight: 500 }}>{log.fill_status.replace('_', ' ')}</td>
                        <td style={{ padding: '0.85rem 0.5rem', textTransform: 'capitalize', fontWeight: 500 }}>{log.label_status.replace('_', ' ')}</td>
                        <td style={{ padding: '0.85rem 0.5rem', fontFamily: theme.typography.fontFamily.mono, fontWeight: 600 }}>{(log.confidence * 100).toFixed(1)}%</td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <Badge variant={badgeVariant} size="small" glow>{log.pass_fail}</Badge>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                          {log.screenshot_path ? (
                            <button
                              onClick={() => { setActiveImage(log.screenshot_path); showToast(`Opening defect frame log #${log.id}`, 'info', 1500); }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: theme.colors.primary,
                                fontWeight: 700,
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                                padding: 0
                              }}
                            >
                              View Defect
                            </button>
                          ) : (
                            <span style={{ color: theme.colors.text.tertiary, fontFamily: theme.typography.fontFamily.mono }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: theme.spacing.md,
              borderTop: `1px solid ${theme.colors.border}`,
              fontSize: '0.725rem'
            }}>
              <span style={{ color: theme.colors.text.secondary, fontWeight: 500 }}>
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} records
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  variant="secondary"
                  size="small"
                >
                  Prev
                </Button>
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  variant="secondary"
                  size="small"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Defect photo visual zoom overlay modal */}
      {activeImage && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 7, 13, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: theme.spacing.lg,
            animation: 'fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards'
          }}
          onClick={() => setActiveImage(null)}
        >
          <div 
            style={{
              maxWidth: '800px',
              width: '100%',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius['2xl'],
              border: `1px solid ${theme.colors.border}`,
              boxShadow: theme.shadows.xl,
              overflow: 'hidden',
              animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: isDark ? '#141A2B' : '#FAFBFD',
              borderBottom: `1px solid ${theme.colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text.primary, letterSpacing: '0.01em' }}>
                Anomaly Photo Frame Analyzer
              </span>
              <Button
                onClick={() => setActiveImage(null)}
                variant="secondary"
                size="small"
              >
                Close Preview
              </Button>
            </div>
            
            <div style={{
              aspectRatio: '16/9',
              backgroundColor: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src={activeImage} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                alt="Defective item screenshot zoom" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
