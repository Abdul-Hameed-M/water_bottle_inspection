import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Play,
  Calendar,
  Camera,
  Smartphone,
  Monitor,
  Video,
  TrendingUp,
  Cpu,
  Database,
  RefreshCw,
  Clock,
  Award,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTheme } from '../theme/ThemeContext';
import { PageLoader } from '../components/common/Loader';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import api from '../services/api';
import StatCard from '../components/StatCard';
import { useToast } from '../components/common/Toast';

const RANGE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'all', label: 'All Time' },
];

const SOURCE_OPTIONS = [
  { id: '', label: 'All Sources' },
  { id: 'webcam', label: 'Laptop Webcam' },
  { id: 'ipcam', label: 'Mobile IP Camera' },
  { id: 'rtsp', label: 'RTSP CCTV' },
  { id: 'video', label: 'Recorded Video' },
];

// Color definitions matching the prompt guidelines
const LABEL_CHART_COLORS = {
  proper_fill: '#00E676',   // green
  under_fill: '#FF7F50',    // coral
  over_fill: '#FFD700',     // gold
  label_proper: '#BA55D3',  // purple
  label_torn: '#FF1493',    // pink
  label_missing: '#FF0000', // red
};

const LABEL_DISPLAY = {
  proper_fill: 'Proper Fill',
  under_fill: 'Under Fill',
  over_fill: 'Over Fill',
  label_proper: 'Proper Label',
  label_torn: 'Torn Label',
  label_missing: 'Missing Label',
};

const Dashboard = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme.mode === 'dark';
  const navigate = useNavigate();

  // Primary states
  const [range, setRange] = useState('today');
  const [sourceFilter, setSourceFilter] = useState('');
  const [data, setData] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Drill-down search & filter states
  const [bottleSearch, setBottleSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Diagnostics and telemetry live stats simulation
  const [telemetry, setTelemetry] = useState({
    cpuTemp: 52.4,
    gpuTemp: 54.1,
    latency: 24,
    memoryLoad: 42.5,
    dbSize: 112, // KB
    fanSpeed: 2150, // RPM
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        cpuTemp: parseFloat((48 + Math.random() * 8).toFixed(1)),
        gpuTemp: parseFloat((50 + Math.random() * 7).toFixed(1)),
        latency: Math.floor(18 + Math.random() * 8),
        memoryLoad: parseFloat((38 + Math.random() * 9).toFixed(1)),
        fanSpeed: Math.floor(2100 + Math.random() * 120),
        dbSize: prev.dbSize
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      let url = `/analytics/production?range=${range}`;
      if (sourceFilter) url += `&source_type=${sourceFilter}`;
      const res = await api.get(url);
      setData(res.data);
    } catch (e) {
      console.error('Failed to fetch telemetry analytics:', e);
      showToast('SCADA network sync failed. Check backend status.', 'error', 3500);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const openSession = async (inspectionId) => {
    setSelectedSession(inspectionId);
    setBottleSearch('');
    setStatusFilter('ALL');
    try {
      const res = await api.get(`/analytics/session/${inspectionId}`);
      setSessionDetail(res.data);
    } catch (e) {
      setSessionDetail(null);
      showToast('Failed to pull session telemetry logs.', 'error', 2500);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(timer);
  }, [range, sourceFilter]);

  const handleRangeChange = (newRange) => {
    setRange(newRange);
    showToast(`Reporting window updated to: ${RANGE_OPTIONS.find(o => o.id === newRange)?.label}`, 'success', 2000);
  };

  if (loading && !data) {
    return <PageLoader text="Syncing SCADA telemetry servers & YOLO pipeline..." />;
  }

  const summary = data?.summary || {};
  const labelCounts = data?.label_counts || {};
  const byDate = data?.by_date || [];
  const bySource = data?.by_source || [];
  const byInspection = data?.by_inspection || [];
  const eod = data?.end_of_day || {};

  // Formulate pie chart
  const labelPieData = Object.entries(labelCounts)
    .filter(([k, v]) => v > 0)
    .map(([name, value]) => ({
      name: LABEL_DISPLAY[name] || name,
      value,
      key: name,
    }));

  // Estimated trend & grade calculation for selected session
  const sessionGrade = (() => {
    if (!sessionDetail?.totals) return 'Grade N/A';
    const scans = sessionDetail.totals.total_scans;
    const passed = sessionDetail.totals.passed;
    if (!scans) return 'Grade S';
    const passRate = (passed / scans) * 100;
    if (passRate >= 98) return 'Grade A+';
    if (passRate >= 95) return 'Grade A';
    if (passRate >= 90) return 'Grade B';
    if (passRate >= 80) return 'Grade C';
    return 'Grade D (Critical Anomaly)';
  })();

  const sessionTrend = (() => {
    if (!sessionDetail?.totals || !summary.total_scans) return 'STABLE';
    const sessionDefectRate = (sessionDetail.totals.failed / sessionDetail.totals.total_scans) * 100;
    const overallDefectRate = (summary.failed / summary.total_scans) * 100;
    if (sessionDefectRate < overallDefectRate - 0.5) return 'IMPROVING';
    if (sessionDefectRate > overallDefectRate + 0.5) return 'DEGRADING';
    return 'STABLE';
  })();

  // Filter logs in modal dynamically
  const filteredLogs = (() => {
    if (!sessionDetail?.logs) return [];
    return sessionDetail.logs.filter(log => {
      const matchSearch = String(log.bottle_id ?? '').toLowerCase().includes(bottleSearch.toLowerCase());
      if (statusFilter === 'ALL') return matchSearch;
      return matchSearch && log.pass_fail === statusFilter;
    });
  })();

  // Plain English why failed logic
  const getFailureReason = (log) => {
    if (log.pass_fail === 'PASS') return '✓ All checks passed';
    const errors = [];
    if (log.fill_status === 'under_fill') errors.push('⚠ Under-filled bottle');
    else if (log.fill_status === 'over_fill') errors.push('⚠ Over-filled bottle');

    if (log.label_status === 'label_torn') errors.push('⚠ Label damaged/torn');
    else if (log.label_status === 'label_missing') errors.push('🚫 Label missing');

    if (errors.length === 0) {
      if (log.pass_fail === 'FAIL') return '🚫 Inspection rejected';
      return '⚠ Anomaly flagged';
    }
    return errors.join(' · ');
  };

  // Find average metrics
  const avgFps = byInspection.length > 0 
    ? parseFloat((byInspection.reduce((acc, val) => acc + (val.avg_fps || 0), 0) / byInspection.length).toFixed(1)) 
    : 29.8;
  const avgLatency = byInspection.length > 0 
    ? Math.round(byInspection.reduce((acc, val) => acc + (val.avg_latency || 0), 0) / byInspection.length) 
    : 22;

  // Extract last scanned bottle details from session rows if available
  const lastScannedSession = byInspection[0];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.lg
    }}>
      
      {/* Platform Title Section */}
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
            Manufacturing Telemetry Dashboard
          </h1>
          <p style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.text.secondary,
            fontFamily: theme.typography.fontFamily.sans,
            marginTop: '0.25rem',
            margin: 0
          }}>
            Industrial water bottle scan reports, live neural network outputs, and operator diagnostics.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: theme.spacing.sm, width: '100%' }} className="sm:w-auto">
          <Button
            onClick={() => { fetchData(true); showToast('SCADA databases successfully synced', 'success', 2000); }}
            variant="secondary"
            icon={RefreshCw}
            loading={isRefreshing}
          >
            Sync
          </Button>
          <Button
            onClick={() => navigate('/detection')}
            icon={Play}
            variant="primary"
          >
            Launch Inspection Panel
          </Button>
        </div>
      </div>

      {/* Grid of EOD summary & Telemetry indicators */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: theme.spacing.lg
      }} className="lg:grid-cols-3">
        
        {/* End of Day banner */}
        <div 
          style={{
            background: isDark 
              ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(7, 11, 19, 0.98) 100%)' 
              : 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)',
            borderRadius: theme.borderRadius['2xl'],
            padding: theme.spacing.lg,
            border: `1px solid ${theme.colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: theme.shadows.md,
            position: 'relative',
            overflow: 'hidden'
          }}
          className="lg:col-span-2"
        >
          {/* Futuristic grid background line effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '150px',
            height: '100%',
            opacity: 0.03,
            background: 'linear-gradient(90deg, transparent 49%, rgba(255,255,255,0.1) 50%, transparent 51%)',
            backgroundSize: '15px 100%',
            pointerEvents: 'none'
          }} />

          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: theme.spacing.md
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} style={{ color: theme.colors.primary }} />
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontFamily: theme.typography.fontFamily.mono,
                  letterSpacing: '0.075em',
                  color: theme.colors.text.secondary
                }}>
                  SHIFT DIAGNOSTICS & VERDICTS — {eod.date || 'Today'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Badge variant="success" glow>SHIFT RUNNING</Badge>
                {lastScannedSession && (
                  <Badge variant="secondary" style={{ fontFamily: theme.typography.fontFamily.mono, fontSize: '0.6rem' }}>
                    Active ID: {lastScannedSession.inspection_id.substring(0, 8)}
                  </Badge>
                )}
              </div>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: theme.spacing.md
            }} className="md:grid-cols-4">
              <div>
                <p style={{ fontSize: '0.625rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.tertiary, margin: 0, textTransform: 'uppercase' }}>Shift Scans</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: theme.typography.fontFamily.heading, margin: '0.25rem 0 0 0', color: theme.colors.text.primary }}>{eod.total_scans ?? 0}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.tertiary, margin: 0, textTransform: 'uppercase' }}>Verdict OK</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: theme.typography.fontFamily.heading, margin: '0.25rem 0 0 0', color: theme.colors.success }}>{eod.passed ?? 0}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.tertiary, margin: 0, textTransform: 'uppercase' }}>Defects Flagged</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: theme.typography.fontFamily.heading, margin: '0.25rem 0 0 0', color: theme.colors.error }}>{eod.failed ?? 0}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.tertiary, margin: 0, textTransform: 'uppercase' }}>Quality Yield</p>
                <p style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 800, 
                  fontFamily: theme.typography.fontFamily.heading, 
                  margin: '0.25rem 0 0 0', 
                  color: (eod.total_scans ? (eod.passed / eod.total_scans * 100) : 0) >= 95 ? theme.colors.success : theme.colors.warning
                }}>
                  {eod.total_scans ? ((eod.passed / eod.total_scans) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: theme.spacing.md,
            paddingTop: theme.spacing.md,
            borderTop: `1px solid ${theme.colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              fontFamily: theme.typography.fontFamily.mono,
              color: theme.colors.text.tertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Active Input Sources & Yield
            </span>
            {eod.by_source?.length > 0 ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: theme.spacing.md,
                fontSize: '0.675rem',
                color: theme.colors.text.secondary,
                fontFamily: theme.typography.fontFamily.mono
              }}>
                {eod.by_source.map((s) => {
                  const srcYield = s.total ? (((s.total - s.failed) / s.total) * 100).toFixed(1) : '100.0';
                  return (
                    <span key={s.source_type} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: theme.colors.surfaceHover, padding: '0.2rem 0.5rem', borderRadius: theme.borderRadius.sm, border: `1px solid ${theme.colors.border}` }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: s.failed > 0 ? theme.colors.warning : theme.colors.success }} />
                      {s.source_label}: <strong style={{ color: theme.colors.text.primary }}>{s.total}</strong> scans ({srcYield}% yield)
                    </span>
                  );
                })}
              </div>
            ) : (
              <span style={{ fontSize: '0.675rem', color: theme.colors.text.tertiary, fontStyle: 'italic' }}>
                No active source telemetry detected today.
              </span>
            )}
          </div>
        </div>

        {/* Live System telemetry console */}
        <Card title="AI Telemetry Console" icon={Cpu} glass>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '0.35rem' }}>
              <span style={{ color: theme.colors.text.secondary, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Cpu size={12} /> GPU Accelerate</span>
              <span style={{ fontFamily: theme.typography.fontFamily.mono, fontWeight: 700, color: theme.colors.success }}>Metal (MPS) Active</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '0.35rem' }}>
              <span style={{ color: theme.colors.text.secondary, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> Inference Latency</span>
              <span style={{ fontFamily: theme.typography.fontFamily.mono, fontWeight: 700, color: theme.colors.primary }}>~{telemetry.latency} ms</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '0.35rem' }}>
              <span style={{ color: theme.colors.text.secondary, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Activity size={12} /> Heap Memory</span>
              <span style={{ fontFamily: theme.typography.fontFamily.mono, fontWeight: 700, color: theme.colors.text.primary }}>{telemetry.memoryLoad}% heap</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '0.35rem' }}>
              <span style={{ color: theme.colors.text.secondary, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Database size={12} /> SQLite Server</span>
              <span style={{ fontFamily: theme.typography.fontFamily.mono, fontWeight: 700, color: theme.colors.text.primary }}>seewise.db (Connected)</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
              <div style={{ flex: 1, backgroundColor: theme.colors.surfaceHover, borderRadius: theme.borderRadius.md, padding: '0.4rem', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <span style={{ fontSize: '0.55rem', color: theme.colors.text.tertiary, display: 'block', fontWeight: 600 }}>CPU TEMP</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: telemetry.cpuTemp > 56 ? theme.colors.warning : theme.colors.text.secondary, fontFamily: theme.typography.fontFamily.mono }}>{telemetry.cpuTemp}°C</span>
              </div>
              <div style={{ flex: 1, backgroundColor: theme.colors.surfaceHover, borderRadius: theme.borderRadius.md, padding: '0.4rem', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <span style={{ fontSize: '0.55rem', color: theme.colors.text.tertiary, display: 'block', fontWeight: 600 }}>GPU TEMP</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: theme.colors.primary, fontFamily: theme.typography.fontFamily.mono }}>{telemetry.gpuTemp}°C</span>
              </div>
              <div style={{ flex: 1, backgroundColor: theme.colors.surfaceHover, borderRadius: theme.borderRadius.md, padding: '0.4rem', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <span style={{ fontSize: '0.55rem', color: theme.colors.text.tertiary, display: 'block', fontWeight: 600 }}>COOLER FAN</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: theme.colors.success, fontFamily: theme.typography.fontFamily.mono }}>{telemetry.fanSpeed}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* KPI Cards Row - Section A */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: theme.spacing.md
      }} className="sm:grid-cols-4 lg:grid-cols-7">
        <StatCard title="Total Bottles" value={summary.total_scans ?? 0} icon={Package} subtitle="Aggregated count" />
        <StatCard title="Passed Items" value={summary.passed ?? 0} colorClass="green" icon={CheckCircle2} subtitle="Passed Checks" />
        <StatCard title="Failed Defects" value={summary.failed ?? 0} colorClass="red" icon={AlertTriangle} subtitle="Rejected/Caution" />
        <StatCard title="Pass Rate" value={summary.pass_rate_percent ?? 0} unit="%" colorClass="text-blue-500" icon={TrendingUp} subtitle="Shift Quality yield" />
        <StatCard title="Total Sessions" value={summary.sessions ?? 0} icon={Activity} subtitle="Unique inspections" />
        <StatCard title="Average FPS" value={avgFps} icon={Monitor} subtitle="Pipeline performance" />
        <StatCard title="Avg Latency" value={avgLatency} unit="ms" colorClass="warning" icon={Clock} subtitle="Inference latency" />
      </div>

      {/* Filter panel - Section C */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.25rem',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        border: `1px solid ${theme.colors.border}`,
        gap: theme.spacing.md,
        boxShadow: theme.shadows.sm
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: theme.spacing.xs
        }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleRangeChange(opt.id)}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: theme.typography.fontSize.xs,
                fontFamily: theme.typography.fontFamily.heading,
                fontWeight: 600,
                borderRadius: theme.borderRadius.md,
                border: 'none',
                backgroundColor: range === opt.id ? theme.colors.primary : 'transparent',
                color: range === opt.id ? '#FFFFFF' : theme.colors.text.secondary,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (range !== opt.id) e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              }}
              onMouseLeave={(e) => {
                if (range !== opt.id) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SlidersHorizontal size={14} style={{ color: theme.colors.text.secondary }} />
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); showToast('Input filter updated', 'info', 1500); }}
            style={{
              padding: '0.45rem 2rem 0.45rem 1rem',
              borderRadius: theme.borderRadius.lg,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text.primary,
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.semibold,
              outline: 'none',
              cursor: 'pointer',
              webkitAppearance: 'none',
              mozAppearance: 'none',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1rem'
            }}
          >
            {SOURCE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Charts Grid - Section D */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: theme.spacing.lg
      }} className="lg:grid-cols-2">
        
        <Card title="Yield Progression Trend" padding="lg">
          <div style={{ height: '280px', marginTop: theme.spacing.md }}>
            {byDate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDate} margin={{ top: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: theme.colors.text.secondary }} axisLine={{ stroke: theme.colors.border }} />
                  <YAxis tick={{ fontSize: 9, fill: theme.colors.text.secondary }} axisLine={{ stroke: theme.colors.border }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme.colors.surface, 
                      borderColor: theme.colors.border,
                      borderRadius: theme.borderRadius.lg,
                      color: theme.colors.text.primary,
                      fontFamily: theme.typography.fontFamily.sans,
                      fontSize: '11px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="passed" name="Pass (OK)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" name="Defects (FAIL)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.colors.text.tertiary, fontSize: theme.typography.fontSize.xs }}>
                No yield data recorded.
              </div>
            )}
          </div>
        </Card>

        <Card title="Inspections by Input Device" padding="lg">
          <div style={{ height: '280px', marginTop: theme.spacing.md }}>
            {bySource.some((s) => s.total_scans > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySource} layout="vertical" margin={{ left: -10, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.colors.border} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: theme.colors.text.secondary }} axisLine={{ stroke: theme.colors.border }} />
                  <YAxis type="category" dataKey="source_label" width={110} tick={{ fontSize: 9, fill: theme.colors.text.secondary }} axisLine={{ stroke: theme.colors.border }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: theme.colors.surface, 
                      borderColor: theme.colors.border,
                      borderRadius: theme.borderRadius.lg,
                      color: theme.colors.text.primary,
                      fontFamily: theme.typography.fontFamily.sans,
                      fontSize: '11px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="passed" name="Pass" fill="#10B981" stackId="a" />
                  <Bar dataKey="failed" name="Fail" fill="#EF4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.colors.text.tertiary, fontSize: theme.typography.fontSize.xs }}>
                No device analytics logged.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Defects Analysis Row - Section G */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: theme.spacing.lg
      }} className="lg:grid-cols-2">
        
        <Card title="Defect Label Classification Ratio" padding="lg">
          <div style={{ height: '260px', marginTop: theme.spacing.md }}>
            {labelPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={labelPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={2} label={{ fontSize: 9, fill: theme.colors.text.secondary }}>
                    {labelPieData.map((entry) => (
                      <Cell key={entry.key} fill={LABEL_CHART_COLORS[entry.key] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme.colors.surface, 
                      borderColor: theme.colors.border,
                      borderRadius: theme.borderRadius.lg,
                      color: theme.colors.text.primary,
                      fontSize: '11px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '9px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.colors.text.tertiary, fontSize: theme.typography.fontSize.xs }}>
                No anomaly labels recorded.
              </div>
            )}
          </div>
        </Card>

        <Card title="Classification Matrix Counters" padding="lg">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            fontSize: theme.typography.fontSize.xs,
            marginTop: theme.spacing.md
          }}>
            {Object.entries(LABEL_DISPLAY).map(([key, label]) => (
              <div key={key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${theme.colors.border}`,
                paddingBottom: '0.45rem'
              }}>
                <span style={{ color: theme.colors.text.secondary, fontWeight: 500 }}>{label}</span>
                <span style={{
                  fontFamily: theme.typography.fontFamily.mono,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: LABEL_CHART_COLORS[key],
                  backgroundColor: LABEL_CHART_COLORS[key] + '12',
                  padding: '0.15rem 0.6rem',
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${LABEL_CHART_COLORS[key]}30`
                }}>
                  {labelCounts[key] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Session Tables Panel - Section E */}
      <Card title="Inspection Session Records (Active Shift)" padding="lg">
        <p style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.text.secondary,
          margin: `-0.5rem 0 ${theme.spacing.lg} 0`
        }}>
          Click any session item row to overlay the inspector yield metrics, hourly rates, and diagnostics logs.
        </p>
        
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
                <th style={{ padding: '0.75rem 0.5rem' }}>Session ID</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Input Device</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Scans</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Verdict OK</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Reject</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Pass %</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Under Fill</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Over Fill</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Torn Label</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Missing Label</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>FPS</th>
              </tr>
            </thead>
            <tbody>
              {byInspection.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: theme.colors.text.tertiary,
                    fontWeight: 500
                  }}>
                    Standby mode active. Trigger Live Inspection to feed analytics databases.
                  </td>
                </tr>
              ) : (
                byInspection.map((row) => {
                  const passRate = row.total_scans ? ((row.passed / row.total_scans) * 100) : 0;
                  const passRateColor = passRate >= 95 
                    ? theme.colors.success 
                    : passRate >= 80 
                      ? theme.colors.warning 
                      : theme.colors.error;

                  return (
                    <tr
                      key={row.inspection_id}
                      style={{
                        borderBottom: `1px solid ${theme.colors.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={() => openSession(row.inspection_id)}
                    >
                      <td style={{
                        padding: '0.85rem 0.5rem',
                        fontFamily: theme.typography.fontFamily.mono,
                        fontWeight: 700,
                        color: theme.colors.primary
                      }}>{row.inspection_id.substring(0, 10)}...</td>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 500 }}>{row.source_label}</td>
                      <td style={{
                        padding: '0.85rem 0.5rem',
                        color: theme.colors.text.secondary
                      }}>
                        {row.timestamp ? new Date(row.timestamp).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 700, fontFamily: theme.typography.fontFamily.mono }}>{row.total_scans}</td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: theme.colors.success, fontWeight: 700, fontFamily: theme.typography.fontFamily.mono }}>{row.passed}</td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: theme.colors.error, fontWeight: 700, fontFamily: theme.typography.fontFamily.mono }}>{row.failed}</td>
                      
                      {/* Colored Pass Percentage */}
                      <td style={{ 
                        padding: '0.85rem 0.5rem', 
                        textAlign: 'center', 
                        fontWeight: 800, 
                        fontFamily: theme.typography.fontFamily.mono,
                        color: passRateColor
                      }}>
                        {passRate.toFixed(1)}%
                      </td>

                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: row.under_fill > 0 ? '#FF7F50' : theme.colors.text.tertiary }}>{row.under_fill}</td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: row.over_fill > 0 ? '#FFD700' : theme.colors.text.tertiary }}>{row.over_fill}</td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: row.label_torn > 0 ? '#FF1493' : theme.colors.text.tertiary }}>{row.label_torn}</td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: row.label_missing > 0 ? '#FF0000' : theme.colors.text.tertiary }}>{row.label_missing}</td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontFamily: theme.typography.fontFamily.mono, fontWeight: 600 }}>{row.avg_fps}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Hourly break overlay session modal - Section F */}
      <Modal
        isOpen={!!selectedSession && !!sessionDetail?.session}
        onClose={() => { setSelectedSession(null); setSessionDetail(null); }}
        title={`Session Diagnostics ID: ${sessionDetail?.session?.inspection_id?.substring(0, 16)}...`}
        subtitle={`Device: ${sessionDetail?.session?.source_label} · Triggered: ${sessionDetail?.session?.timestamp ? new Date(sessionDetail.session.timestamp).toLocaleString() : ''}`}
        size="large"
      >
        {sessionDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
            
            {/* Modal Head Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: theme.spacing.sm
            }} className="md:grid-cols-6">
              
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: theme.borderRadius.xl,
                padding: '0.6rem',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.55rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.secondary, textTransform: 'uppercase', display: 'block' }}>Passed Items</span>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: theme.colors.success,
                  fontFamily: theme.typography.fontFamily.heading,
                  display: 'block',
                  marginTop: '0.2rem'
                }}>{sessionDetail.totals?.passed}</span>
              </div>

              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: theme.borderRadius.xl,
                padding: '0.6rem',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.55rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.secondary, textTransform: 'uppercase', display: 'block' }}>Defects</span>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: theme.colors.error,
                  fontFamily: theme.typography.fontFamily.heading,
                  display: 'block',
                  marginTop: '0.2rem'
                }}>{sessionDetail.totals?.failed}</span>
              </div>

              <div style={{
                backgroundColor: theme.colors.surfaceHover,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.xl,
                padding: '0.6rem',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.55rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.secondary, textTransform: 'uppercase', display: 'block' }}>Total Evaluated</span>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: theme.colors.text.primary,
                  fontFamily: theme.typography.fontFamily.heading,
                  display: 'block',
                  marginTop: '0.2rem'
                }}>{sessionDetail.totals?.total_scans}</span>
              </div>

              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: theme.borderRadius.xl,
                padding: '0.6rem',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.55rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.secondary, textTransform: 'uppercase', display: 'block' }}>Yield Rate</span>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: theme.colors.primary,
                  fontFamily: theme.typography.fontFamily.heading,
                  display: 'block',
                  marginTop: '0.2rem'
                }}>
                  {sessionDetail.totals?.total_scans 
                    ? ((sessionDetail.totals.passed / sessionDetail.totals.total_scans) * 100).toFixed(1) 
                    : '0.0'}%
                </span>
              </div>

              {/* Quality Grade Card */}
              <div style={{
                backgroundColor: 'rgba(186, 85, 211, 0.05)',
                border: '1px solid rgba(186, 85, 211, 0.15)',
                borderRadius: theme.borderRadius.xl,
                padding: '0.6rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.55rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.secondary, textTransform: 'uppercase', display: 'block' }}>Quality Grade</span>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: '#BA55D3',
                  fontFamily: theme.typography.fontFamily.heading,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.15rem',
                  marginTop: '0.2rem'
                }}>
                  <Award size={13} /> {sessionGrade.split(' ')[1]}
                </span>
              </div>

              {/* Defect Trend Card */}
              <div style={{
                backgroundColor: sessionTrend === 'IMPROVING' 
                  ? 'rgba(16, 185, 129, 0.05)' 
                  : sessionTrend === 'DEGRADING' 
                    ? 'rgba(239, 68, 68, 0.05)' 
                    : theme.colors.surfaceHover,
                border: `1px solid ${sessionTrend === 'IMPROVING' ? 'rgba(16, 185, 129, 0.15)' : sessionTrend === 'DEGRADING' ? 'rgba(239, 68, 68, 0.15)' : theme.colors.border}`,
                borderRadius: theme.borderRadius.xl,
                padding: '0.6rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.55rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.secondary, textTransform: 'uppercase', display: 'block' }}>Defect Trend</span>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: sessionTrend === 'IMPROVING' 
                    ? theme.colors.success 
                    : sessionTrend === 'DEGRADING' 
                      ? theme.colors.error 
                      : theme.colors.text.secondary,
                  fontFamily: theme.typography.fontFamily.mono,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.15rem',
                  marginTop: '0.2rem'
                }}>
                  {sessionTrend === 'IMPROVING' ? <ArrowDownRight size={13} /> : sessionTrend === 'DEGRADING' ? <ArrowUpRight size={13} /> : <ChevronRight size={13} />}
                  {sessionTrend}
                </span>
              </div>
            </div>

            {/* Hourly throughput line chart */}
            {sessionDetail.hourly?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.675rem', fontFamily: theme.typography.fontFamily.heading, fontWeight: 700, color: theme.colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: theme.spacing.md }}>Hourly Throughput Speeds</h4>
                <div style={{ height: '160px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sessionDetail.hourly} margin={{ left: -20, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.border} />
                      <XAxis dataKey="hour" tick={{ fontSize: 8, fill: theme.colors.text.secondary }} />
                      <YAxis tick={{ fontSize: 8, fill: theme.colors.text.secondary }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme.colors.surface, 
                          borderColor: theme.colors.border,
                          borderRadius: theme.borderRadius.lg,
                          fontSize: '11px'
                        }} 
                      />
                      <Bar dataKey="passed" fill="#10B981" name="Pass" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="failed" fill="#EF4444" name="Fail" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Per-Bottle Inspector Logs */}
            <div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                borderTop: `1px solid ${theme.colors.border}`,
                paddingTop: theme.spacing.md
              }}>
                <h4 style={{ fontSize: '0.675rem', fontFamily: theme.typography.fontFamily.heading, fontWeight: 700, color: theme.colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Per-Bottle Real-Time Inspection List
                </h4>

                {/* Filter and search tools inside modal */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={12} style={{ position: 'absolute', left: '0.45rem', top: '50%', transform: 'translateY(-50%)', color: theme.colors.text.tertiary }} />
                    <input
                      type="text"
                      placeholder="Search Bottle ID..."
                      value={bottleSearch}
                      onChange={(e) => setBottleSearch(e.target.value)}
                      style={{
                        padding: '0.25rem 0.5rem 0.25rem 1.35rem',
                        fontSize: '0.675rem',
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text.primary,
                        outline: 'none',
                        width: '120px'
                      }}
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.675rem',
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text.primary,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="ALL">All Status</option>
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                  </select>
                </div>
              </div>

              {/* Logs Table */}
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.lg }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: theme.colors.surface, borderBottom: `1px solid ${theme.colors.border}`, zIndex: 1 }}>
                    <tr style={{ color: theme.colors.text.secondary, fontWeight: 700 }}>
                      <th style={{ padding: '0.45rem' }}>Bottle ID</th>
                      <th style={{ padding: '0.45rem' }}>Time</th>
                      <th style={{ padding: '0.45rem' }}>Fill Check</th>
                      <th style={{ padding: '0.45rem' }}>Label Check</th>
                      <th style={{ padding: '0.45rem', width: '90px' }}>Confidence</th>
                      <th style={{ padding: '0.45rem', textAlign: 'center' }}>Verdict</th>
                      <th style={{ padding: '0.45rem' }}>Diagnose reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: theme.colors.text.tertiary, fontStyle: 'italic' }}>
                          No bottle inspection matching active filters.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const isPass = log.pass_fail === 'PASS';
                        const rowBg = isPass 
                          ? 'rgba(16, 185, 129, 0.02)' 
                          : 'rgba(239, 68, 68, 0.02)';
                        const borderL = isPass
                          ? `3px solid ${theme.colors.success}`
                          : `3px solid ${theme.colors.error}`;

                        return (
                          <tr key={log.id} style={{ 
                            backgroundColor: rowBg, 
                            borderBottom: `1px solid ${theme.colors.border}`,
                            transition: 'background-color 0.15s ease'
                          }}
                          className="hover:bg-opacity-10"
                          >
                            <td style={{ 
                              padding: '0.45rem', 
                              fontWeight: 700, 
                              fontFamily: theme.typography.fontFamily.mono,
                              borderLeft: borderL,
                              color: isPass ? theme.colors.text.primary : theme.colors.error
                            }}>
                              {log.bottle_id || 'UNKNOWN'}
                            </td>
                            <td style={{ padding: '0.45rem', color: theme.colors.text.secondary }}>
                              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—'}
                            </td>
                            
                            {/* Fill Status badge */}
                            <td style={{ padding: '0.45rem' }}>
                              <span style={{ 
                                color: LABEL_CHART_COLORS[log.fill_status] || theme.colors.text.primary,
                                fontWeight: 600
                              }}>
                                {LABEL_DISPLAY[log.fill_status] || log.fill_status}
                              </span>
                            </td>

                            {/* Label Status badge */}
                            <td style={{ padding: '0.45rem' }}>
                              <span style={{ 
                                color: LABEL_CHART_COLORS[log.label_status] || theme.colors.text.primary,
                                fontWeight: 600
                              }}>
                                {LABEL_DISPLAY[log.label_status] || log.label_status}
                              </span>
                            </td>

                            {/* Confidence Progress Bar */}
                            <td style={{ padding: '0.45rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span style={{ fontFamily: theme.typography.fontFamily.mono, fontSize: '0.65rem', width: '25px' }}>
                                  {Math.round(log.confidence * 100)}%
                                </span>
                                <div style={{ 
                                  flex: 1, 
                                  height: '4px', 
                                  backgroundColor: theme.colors.border, 
                                  borderRadius: '2px', 
                                  overflow: 'hidden' 
                                }}>
                                  <div style={{ 
                                    width: `${log.confidence * 100}%`, 
                                    height: '100%', 
                                    backgroundColor: log.confidence > 0.85 
                                      ? theme.colors.success 
                                      : log.confidence > 0.65 
                                        ? theme.colors.warning 
                                        : theme.colors.error
                                  }} />
                                </div>
                              </div>
                            </td>

                            {/* Verdict status badge */}
                            <td style={{ padding: '0.45rem', textAlign: 'center' }}>
                              <Badge variant={isPass ? 'success' : 'danger'}>
                                {log.pass_fail}
                              </Badge>
                            </td>

                            {/* Failure reason explanation */}
                            <td style={{ 
                              padding: '0.45rem', 
                              color: isPass ? theme.colors.text.tertiary : theme.colors.error,
                              fontSize: '0.65rem',
                              fontWeight: 500
                            }}>
                              {getFailureReason(log)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;

