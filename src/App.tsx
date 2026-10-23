import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TopNav } from './components/TopNav';
import { DashboardView } from './views/DashboardView';
import { DonationsView } from './views/DonationsView';
import { DispatchCenterView } from './views/DispatchCenterView';
import { VolunteersView } from './views/VolunteersView';
import { SheltersView } from './views/SheltersView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { LiveOperationsView } from './views/LiveOperationsView';
import { DemoControlCenterView } from './views/DemoControlCenterView';

const MainLayout: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-[#E8EFE9] text-slate-800 antialiased selection:bg-[#E5F940] selection:text-slate-900">
      {/* Top Floating Navigation Bar with Official Sanjeevani Brand */}
      <TopNav />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1520px] mx-auto px-4 sm:px-8 py-3">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'donations' && <DonationsView />}
        {activeTab === 'dispatch' && <DispatchCenterView />}
        {activeTab === 'volunteers' && <VolunteersView />}
        {activeTab === 'shelters' && <SheltersView />}
        {activeTab === 'admin' && <AdminDashboardView />}
        {(activeTab === 'events' || activeTab === 'live') && <LiveOperationsView />}
        {activeTab === 'demo' && <DemoControlCenterView />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;
