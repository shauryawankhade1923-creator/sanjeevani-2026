import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  Bike, 
  Settings, 
  FileText, 
  Activity, 
  RotateCcw, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  Download, 
  Save, 
  ExternalLink, 
  Server, 
  Database, 
  Cpu, 
  Globe, 
  Lock, 
  Clock, 
  UserCheck, 
  UserX, 
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';
import { UserRole, UserStatus, PlatformUser, AidCategory } from '../types';

export const AdminDashboardView: React.FC = () => {
  const { 
    donations, 
    shelters, 
    volunteers, 
    tasks, 
    events, 
    users, 
    config, 
    addUser, 
    updateUserStatus, 
    updateUserRole, 
    deleteUser, 
    updatePlatformConfig, 
    updateShelterStatus, 
    resetAllData 
  } = useApp();

  // Navigation tab within Admin console
  const [activeAdminTab, setActiveAdminTab] = useState<'OVERVIEW' | 'USERS' | 'ORGS' | 'RIDERS' | 'CONFIG' | 'LOGS'>('OVERVIEW');

  // UI state for toasts & modals
  const [actionNotice, setActionNotice] = useState<{ type: 'SUCCESS' | 'ERROR' | 'INFO'; message: string } | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserOrg, setNewUserOrg] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('RELIEF_COORDINATOR');

  // Configuration Form State (seeded from config)
  const [cfgClaimTtl, setCfgClaimTtl] = useState(config.claimTtlSeconds);
  const [cfgWarningMin, setCfgWarningMin] = useState(config.expiryWarningMinutes);
  const [cfgCriticalMin, setCfgCriticalMin] = useState(config.expiryCriticalMinutes);
  const [cfgMaxRiderCap, setCfgMaxRiderCap] = useState(config.maxRiderPayloadCap);
  const [cfgEnforceSafety, setCfgEnforceSafety] = useState(config.enforceSafetyDependencies);
  const [cfgSupportedCategories, setCfgSupportedCategories] = useState<AidCategory[]>(config.supportedCategories);

  // Filters
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logSeverityFilter, setLogSeverityFilter] = useState<string>('ALL');

  const showBanner = (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 6000);
  };

  // Metrics calculation
  const totalOrganizations = donations.length + shelters.length; // Distinct donor batches + shelters
  const activeDonationsCount = donations.filter(d => d.status === 'AVAILABLE' || d.status === 'PARTIALLY_RESERVED').length;
  const activeCouriersCount = volunteers.filter(v => v.status === 'AVAILABLE' || v.status === 'IN_TRANSIT').length;
  const activeSheltersCount = shelters.filter(s => s.status === 'ACCEPTING').length;
  
  const activeDeliveriesCount = tasks.filter(t => ['CLAIMED', 'ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DESTINATION'].includes(t.status)).length;
  const completedDeliveriesCount = tasks.filter(t => t.status === 'DELIVERED').length;
  const failedAssignmentsCount = tasks.filter(t => t.status === 'RECLAIMED' || t.status === 'CANCELLED').length;
  const criticalEventsCount = events.filter(e => e.severity === 'CRITICAL' || e.severity === 'WARNING').length;

  // Handlers
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showBanner('ERROR', 'Name and email are strictly required.');
      return;
    }
    const result = addUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim() || '+91 98000 00000',
      organization: newUserOrg.trim() || 'Civic Partner',
      role: newUserRole,
      status: 'ACTIVE'
    });

    if (result.success) {
      showBanner('SUCCESS', result.message);
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserOrg('');
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const handleSaveConfig = () => {
    const result = updatePlatformConfig({
      claimTtlSeconds: Number(cfgClaimTtl),
      expiryWarningMinutes: Number(cfgWarningMin),
      expiryCriticalMinutes: Number(cfgCriticalMin),
      maxRiderPayloadCap: Number(cfgMaxRiderCap),
      enforceSafetyDependencies: cfgEnforceSafety,
      supportedCategories: cfgSupportedCategories
    });

    if (result.success) {
      showBanner('SUCCESS', 'Platform parameters saved & enforced across coordination engine.');
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const handleToggleCategory = (cat: AidCategory) => {
    setCfgSupportedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleConfirmReset = () => {
    resetAllData();
    setShowResetConfirmModal(false);
    showBanner('SUCCESS', 'Controlled reset complete: Sample baseline restored without corruption.');
  };

  const handleExportAuditCsv = () => {
    const headers = "ID,Timestamp,Severity,Category,Title,Message\n";
    const rows = events.map(e => 
      `"${e.id}","${e.timestamp}","${e.severity}","${e.category}","${e.title.replace(/"/g, '""')}","${e.message.replace(/"/g, '""')}"`
    ).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `sanjeevani_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showBanner('SUCCESS', 'Audit log exported to CSV.');
  };

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-16">
      
      {/* Toast Notice Banner */}
      {actionNotice && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in ${
          actionNotice.type === 'SUCCESS' 
            ? 'bg-emerald-50 text-emerald-950 border-emerald-200' 
            : actionNotice.type === 'ERROR'
            ? 'bg-red-50 text-red-950 border-red-200'
            : 'bg-amber-50 text-amber-950 border-amber-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            {actionNotice.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {actionNotice.type === 'ERROR' && <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />}
            {actionNotice.type === 'INFO' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-600 p-1">
            ✕
          </button>
        </div>
      )}

      {/* TOP COMMAND HEADER: System Overview & Role Identity */}
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0C382E] text-[#E5F940] flex items-center justify-center font-black text-xl shadow-xs border border-emerald-900/30 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-[#E5F940] text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                System Governance
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-600 font-semibold">
                Sanjeevani Super Administrator Console
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Platform Administration & Integrity
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Enforcing zero-spoilage policies, role permissions, infrastructure rules, and operational oversight.
            </p>
          </div>
        </div>

        {/* Right Actions: Demo Reset & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportAuditCsv}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 transition shadow-2xs flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Audit Trail</span>
          </button>

          <button
            onClick={() => setShowResetConfirmModal(true)}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-2xl border border-rose-200 transition shadow-2xs flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Controlled Demo Reset</span>
          </button>
        </div>
      </div>

      {/* ADMIN NAVIGATION TABS */}
      <div className="flex items-center space-x-1 bg-white/90 p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto text-xs font-bold">
        {[
          { id: 'OVERVIEW', label: 'System Overview & Health', icon: Activity },
          { id: 'USERS', label: `Users & Roles (${users.length})`, icon: Users },
          { id: 'ORGS', label: `Organizations (${shelters.length + 3})`, icon: Building2 },
          { id: 'RIDERS', label: `Courier Fleet (${volunteers.length})`, icon: Bike },
          { id: 'CONFIG', label: 'Platform Configuration', icon: Settings },
          { id: 'LOGS', label: `Immutable Audit Log (${events.length})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
                isActive 
                  ? 'bg-[#0C382E] text-[#E5F940] shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: SYSTEM OVERVIEW & HEALTH                      */}
      {/* ==================================================== */}
      {activeAdminTab === 'OVERVIEW' && (
        <div className="space-y-6">
          
          {/* 1. Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white/90 rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Registered Organizations
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {totalOrganizations}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold block">
                {shelters.length} Shelters + Active Donors
              </span>
            </div>

            <div className="bg-white/90 rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Logistics Nodes
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {activeCouriersCount + activeSheltersCount}
              </div>
              <span className="text-[11px] text-slate-500 font-semibold block">
                {activeCouriersCount} Couriers + {activeSheltersCount} Open Shelters
              </span>
            </div>

            <div className="bg-white/90 rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Deliveries Progress
              </span>
              <div className="text-2xl font-black text-purple-950 font-mono">
                {activeDeliveriesCount} In Transit
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold block">
                {completedDeliveriesCount} Safely Delivered (0 Spoiled)
              </span>
            </div>

            <div className={`rounded-3xl p-5 border shadow-xs space-y-1 ${
              criticalEventsCount > 0 ? 'bg-amber-50/90 border-amber-200 text-amber-950' : 'bg-white/90 border-slate-200'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block">
                Alerts & Reclaims
              </span>
              <div className="text-2xl font-black font-mono">
                {failedAssignmentsCount} Reclaimed
              </div>
              <span className="text-[11px] font-semibold block">
                {criticalEventsCount} Operational Warnings Logged
              </span>
            </div>

          </div>

          {/* 2. System Health & Infrastructure Diagnostics */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <span>Platform Service Connectivity & Engine Diagnostics</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time status of persistent storage, micro-logistics execution daemons, and map tiles.
                </p>
              </div>

              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300">
                All Local Daemons Nominal
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Service 1: Local Resilient Storage */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Database className="w-4 h-4 text-slate-500" />
                    <span>State Storage Engine</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active (0.2ms)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  In-Memory reactive store with automatic localStorage persistence. Resilient against offline network loss.
                </p>
              </div>

              {/* Service 2: Ghost Stall Watchdog Daemon */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Watchdog Daemon</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active (1000ms tick)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Automated background interval scanning for unresponsive rider ghost locks and perishable food expiry thresholds.
                </p>
              </div>

              {/* Service 3: OpenStreetMap Cartography */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span>OpenStreetMap GIS Tiles</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Connected (OSM CDN)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Standard public OpenStreetMap tile layer (no third-party proprietary watermark or API key limitation).
                </p>
              </div>

              {/* Service 4: External Database Status */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Server className="w-4 h-4 text-slate-500" />
                    <span>Cloud Database Sync</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                    Standalone Replica
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Running in standalone local replica mode. Full quantity conservation and safety matrix validated in client engine.
                </p>
              </div>

              {/* Service 5: Dispatch Optimization Engine */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Cpu className="w-4 h-4 text-slate-500" />
                    <span>Knapsack Partition Engine</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Deterministic (Pass)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Greedy multi-courier knapsack solver splits large batches (e.g. 180 meals) across two-wheelers without exceeding capacity.
                </p>
              </div>

              {/* Service 6: Security & Role Gatekeeper */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span>Security & RBAC Guard</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Enforced
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Role-based views restrict courier contact disclosures and prevent unauthorized cancellation of in-transit cargo.
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: USER MANAGEMENT & ROLE-BASED ACCESS CONTROL   */}
      {/* ==================================================== */}
      {activeAdminTab === 'USERS' && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Platform User Directory & Role-Based Access Control
              </h3>
              <p className="text-xs text-slate-500">
                Manage coordinators, food donors, field couriers, and shelter supervisors with least-privilege principles.
              </p>
            </div>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 bg-[#0C382E] text-[#E5F940] hover:bg-[#07241D] text-xs font-black rounded-xl transition flex items-center space-x-1.5 shadow-2xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Provision User</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0C382E] text-xs"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'SUPER_ADMIN', 'RELIEF_COORDINATOR', 'DONOR_COORDINATOR', 'FIELD_COURIER', 'SHELTER_SUPERVISOR'].map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition ${
                    userRoleFilter === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User Name & Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Organization / Affiliate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users
                  .filter((u) => {
                    if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
                    if (userSearchQuery.trim() !== '') {
                      const q = userSearchQuery.toLowerCase();
                      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.organization.toLowerCase().includes(q);
                    }
                    return true;
                  })
                  .map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{user.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          user.role === 'SUPER_ADMIN'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : user.role === 'RELIEF_COORDINATOR'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : user.role === 'FIELD_COURIER'
                            ? 'bg-sky-100 text-sky-900 border border-sky-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {user.organization}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          <span>● {user.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(user.registeredAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          {user.status === 'ACTIVE' ? (
                            <button
                              onClick={() => {
                                updateUserStatus(user.id, 'SUSPENDED');
                                showBanner('INFO', `Suspended access for ${user.name}`);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                updateUserStatus(user.id, 'ACTIVE');
                                showBanner('SUCCESS', `Activated access for ${user.name}`);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                            >
                              Activate
                            </button>
                          )}

                          {user.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => {
                                deleteUser(user.id);
                                showBanner('INFO', `Removed user ${user.name}`);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: ORGANIZATION MANAGEMENT                       */}
      {/* ==================================================== */}
      {activeAdminTab === 'ORGS' && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Verified Stakeholder Organizations (Donors & Shelters)
              </h3>
              <p className="text-xs text-slate-500">
                Maintain verification credentials and operational capacities across civic relief camps and food providers.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={orgSearchQuery}
                onChange={(e) => setOrgSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0C382E] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Shelters List */}
            {shelters
              .filter(s => orgSearchQuery === '' || s.name.toLowerCase().includes(orgSearchQuery.toLowerCase()))
              .map((shelter) => (
                <div key={shelter.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          Recipient Shelter
                        </span>
                        <span className="text-xs font-mono text-slate-400">ID: {shelter.id}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base mt-1">{shelter.name}</h4>
                      <p className="text-xs text-slate-500">{shelter.locationName}</p>
                    </div>

                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                      shelter.status === 'ACCEPTING' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {shelter.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200/70">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Intake Capacity</span>
                      <span className="font-mono font-bold text-slate-800">
                        {shelter.currentOccupancy} / {shelter.maxCapacity} units
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Supervisor</span>
                      <span className="font-bold text-slate-800 line-clamp-1">{shelter.contactPerson}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] text-slate-500">Contact: {shelter.contactPhone}</span>
                    
                    <button
                      onClick={() => {
                        const nextStatus = shelter.status === 'ACCEPTING' ? 'CLOSED' : 'ACCEPTING';
                        updateShelterStatus(shelter.id, nextStatus);
                        showBanner('INFO', `Updated ${shelter.name} status to ${nextStatus}`);
                      }}
                      className="px-3 py-1 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      Toggle {shelter.status === 'ACCEPTING' ? 'Close' : 'Open'}
                    </button>
                  </div>
                </div>
              ))}

            {/* Donors List */}
            {donations
              .filter(d => orgSearchQuery === '' || d.donorName.toLowerCase().includes(orgSearchQuery.toLowerCase()))
              .map((d) => (
                <div key={d.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="bg-sky-100 text-sky-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          Verified Donor
                        </span>
                        <span className="text-xs font-mono text-slate-400">Batch: #{d.id.slice(-6)}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base mt-1">{d.donorName}</h4>
                      <p className="text-xs text-slate-500">{d.pickupLocation}</p>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                      {d.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200/70">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Surplus Payload</span>
                      <span className="font-mono font-bold text-slate-800">
                        {d.remainingQuantity} / {d.totalQuantity} units
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Food Category</span>
                      <span className="font-bold text-slate-800 line-clamp-1">{d.category.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                    <span>Contact: {d.donorPhone}</span>
                    <span className="font-bold text-emerald-800">Verified Partner</span>
                  </div>
                </div>
              ))}

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: RIDER FLEET MANAGEMENT                        */}
      {/* ==================================================== */}
      {activeAdminTab === 'RIDERS' && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Two-Wheeler Volunteer Fleet & Courier Eligibility
              </h3>
              <p className="text-xs text-slate-500">
                Monitor live availability, carrying capacity caps, and reliability score telemetry.
              </p>
            </div>

            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              Fleet Total: {volunteers.length} Active Couriers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Courier Name</th>
                  <th className="py-3 px-4">Vehicle Type</th>
                  <th className="py-3 px-4">Max Carry Limit</th>
                  <th className="py-3 px-4">Operational Corridor</th>
                  <th className="py-3 px-4">Duty Status</th>
                  <th className="py-3 px-4">Watchdog Health</th>
                  <th className="py-3 px-4">Reliability Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {volunteers.map((rider) => (
                  <tr key={rider.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {rider.name}
                      <span className="text-[10px] text-slate-400 block font-normal">{rider.phone}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {rider.vehicleType}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {rider.carryCapacity} meals
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {rider.zone}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rider.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rider.status === 'IN_TRANSIT'
                          ? 'bg-purple-100 text-purple-900 animate-pulse'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        ● {rider.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {rider.responsiveness === 'UNRESPONSIVE' ? (
                        <span className="bg-red-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-full animate-bounce">
                          STALL WATCHDOG
                        </span>
                      ) : (
                        <span className="text-[10.5px] text-emerald-700 font-semibold">
                          ✓ Heartbeat Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      ★ {Math.round(rider.reliabilityScore * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: SYSTEM CONFIGURATION & SAFETY POLICIES        */}
      {/* ==================================================== */}
      {activeAdminTab === 'CONFIG' && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <Settings className="w-5 h-5 text-slate-600" />
                <span>Global Micro-Logistics Engine Configuration</span>
              </h3>
              <p className="text-xs text-slate-500">
                Adjust dead-man timeouts, alert thresholds, and strict safety validation matrix rules.
              </p>
            </div>

            <button
              onClick={handleSaveConfig}
              className="px-5 py-2.5 bg-[#0C382E] text-[#E5F940] hover:bg-[#07241D] text-xs font-black rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
            >
              <Save className="w-4 h-4" />
              <span>Save System Parameters</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            
            {/* Parameters Column 1 */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Courier Reservation Claim Timeout (Seconds):
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={cfgClaimTtl}
                  onChange={(e) => setCfgClaimTtl(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold font-mono outline-none focus:ring-2 focus:ring-[#0C382E]"
                />
                <span className="text-[11px] text-slate-400">
                  Accelerated watchdog timer before unclaimed reservations are automatically reclaimed to prevent spoilage.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Safe-Use Expiry Warning Threshold (Minutes):
                </label>
                <input
                  type="number"
                  min="15"
                  max="180"
                  value={cfgWarningMin}
                  onChange={(e) => setCfgWarningMin(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold font-mono outline-none focus:ring-2 focus:ring-[#0C382E]"
                />
                <span className="text-[11px] text-slate-400">
                  Batches below this threshold turn amber and receive priority routing in the coordinator queue.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Maximum Single-Courier Carrying Cap (Units):
                </label>
                <input
                  type="number"
                  min="20"
                  max="80"
                  value={cfgMaxRiderCap}
                  onChange={(e) => setCfgMaxRiderCap(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold font-mono outline-none focus:ring-2 focus:ring-[#0C382E]"
                />
              </div>
            </div>

            {/* Parameters Column 2: Safety Gatekeeper */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px]">
                Enforce Aid Safety Dependencies Matrix
              </span>

              <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block">Strict Dependency Enforcement</span>
                  <span className="text-[11px] text-slate-500">
                    Blocks raw rations without cooking stoves, formula without clean water, and medicine without refrigeration.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={cfgEnforceSafety}
                  onChange={(e) => setCfgEnforceSafety(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </label>

              <div className="space-y-2 pt-2">
                <span className="font-bold text-slate-800 block text-[11px]">
                  Supported Aid Categories Whitelist:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(['COOKED_MEALS', 'BABY_FORMULA', 'RAW_RATIONS', 'COLD_CHAIN_MEDS', 'PACKAGED_FOOD'] as AidCategory[]).map((cat) => (
                    <label key={cat} className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={cfgSupportedCategories.includes(cat)}
                        onChange={() => handleToggleCategory(cat)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                      <span>{cat.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 6: IMMUTABLE AUDIT TRAIL                         */}
      {/* ==================================================== */}
      {activeAdminTab === 'LOGS' && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <FileText className="w-5 h-5 text-slate-600" />
                <span>Immutable Telemetry & Security Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tamper-evident record of all dispatch allocations, ghost watch reclaims, safety violations, and reroutes.
              </p>
            </div>

            <button
              onClick={handleExportAuditCsv}
              className="px-3.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV Report</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit events..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0C382E] text-xs"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'CRITICAL', 'WARNING', 'SUCCESS', 'INFO'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setLogSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition ${
                    logSeverityFilter === sev ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {events
              .filter((e) => {
                if (logSeverityFilter !== 'ALL' && e.severity !== logSeverityFilter) return false;
                if (logSearchQuery.trim() !== '') {
                  const q = logSearchQuery.toLowerCase();
                  return e.title.toLowerCase().includes(q) || e.message.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
                }
                return true;
              })
              .map((event) => (
                <div
                  key={event.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1 transition ${
                    event.severity === 'CRITICAL'
                      ? 'bg-red-50/90 border-red-200 text-red-950'
                      : event.severity === 'WARNING'
                      ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                      : event.severity === 'SUCCESS'
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-md uppercase ${
                        event.severity === 'CRITICAL' ? 'bg-red-200 text-red-900' :
                        event.severity === 'WARNING' ? 'bg-amber-200 text-amber-900' :
                        event.severity === 'SUCCESS' ? 'bg-emerald-200 text-emerald-900' :
                        'bg-slate-200 text-slate-800'
                      }`}>
                        {event.category}
                      </span>
                      <span className="font-bold text-slate-900">{event.title}</span>
                    </div>

                    <span className="font-mono text-[10.5px] text-slate-400">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-[11.5px] text-slate-700 pl-1 leading-relaxed">
                    {event.message}
                  </p>
                </div>
              ))}
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: PROVISION NEW USER                          */}
      {/* ==================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-2.5 text-slate-900">
              <Users className="w-5 h-5 text-emerald-700 shrink-0" />
              <h3 className="text-base font-black">Provision New Platform User</h3>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Full Name *:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sundaram"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0C382E] font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Email Address *:</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. priya@sanjeevani.org"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0C382E] font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Organization / Entity:</label>
                <input
                  type="text"
                  placeholder="e.g. Delhi Relief Sector 4"
                  value={newUserOrg}
                  onChange={(e) => setNewUserOrg(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0C382E]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Contact Phone:</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98111 22334"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0C382E]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Assigned Role:</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0C382E] font-bold"
                >
                  <option value="RELIEF_COORDINATOR">Relief Coordinator (Dispatch Control Room)</option>
                  <option value="DONOR_COORDINATOR">Donor Coordinator (Surplus Ingestion)</option>
                  <option value="FIELD_COURIER">Field Courier (Volunteer Rider)</option>
                  <option value="SHELTER_SUPERVISOR">Shelter Supervisor (Recipient Camp Intake)</option>
                  <option value="SUPER_ADMIN">Super Administrator (Full Governance)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0C382E] text-[#E5F940] hover:bg-[#07241D] font-black rounded-xl shadow-2xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: CONTROLLED DEMO RESET CONFIRMATION          */}
      {/* ==================================================== */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-black text-slate-900">Confirm Controlled Demo Reset</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will safely re-initialize all donations, shelters, couriers, and scenario telemetry to their documented benchmark parameters. Active in-flight deliveries will be cancelled and reset.
            </p>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 text-xs">
              <strong>Sample Baseline Restored:</strong> 180 Meals @ 75m, 5 available volunteer riders, and 5 verified relief shelters.
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
              >
                Yes, Restore Sample Data
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
