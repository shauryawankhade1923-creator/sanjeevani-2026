import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { DonationsView } from './views/DonationsView';
import { DispatchCenterView } from './views/DispatchCenterView';
import { VolunteersView } from './views/VolunteersView';
import { SheltersView } from './views/SheltersView';
import { LiveOperationsView } from './views/LiveOperationsView';
import { DemoControlCenterView } from './views/DemoControlCenterView';

const MainLayout: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'donations' && <DonationsView />}
          {activeTab === 'dispatch' && <DispatchCenterView />}
          {activeTab === 'volunteers' && <VolunteersView />}
          {activeTab === 'shelters' && <SheltersView />}
          {activeTab === 'events' && <LiveOperationsView />}
          {activeTab === 'demo' && <DemoControlCenterView />}
        </main>
      </div>
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
