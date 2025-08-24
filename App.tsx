
import React, { useState, useEffect } from 'react';
import SearchPage from './components/pages/SearchPage';
import AgentsPage from './components/pages/AgentsPage';
import AdminPage from './components/pages/AdminPage';
import { initVFS } from './services/vfs';

type Tab = '지식검색' | '에이전트' | '관리자';

const NavItem: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {label}
  </button>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('지식검색');

  useEffect(() => {
    // Initialize the virtual file system on app load
    initVFS();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case '지식검색':
        return <SearchPage />;
      case '에이전트':
        return <AgentsPage />;
      case '관리자':
        return <AdminPage />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-900">
      <aside className="w-56 flex-shrink-0 bg-slate-800/50 border-r border-slate-700 p-4">
        <div className="text-2xl font-bold text-white mb-8 flex items-center">
           <svg className="h-8 w-8 text-indigo-400 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.5 9.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zm-7 5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zm-7-5C4.12 9.5 3 10.62 3 12s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5S6.88 9.5 5.5 9.5zm7-5C9.12 4.5 8 5.62 8 7s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5S13.88 4.5 12.5 4.5z"></path>
            <path d="M19.15 16.85c-.31-.31-.85-.09-.85.35v1.29c-1.49.9-3.21 1.51-5.05 1.51s-3.56-.61-5.05-1.51v-1.29c0-.44-.54-.66-.85-.35l-1.64 1.64c-.22.22-.22.58 0 .79.31.31.85.09.85-.35V18c2.05 1.23 4.42 2 7.05 2s5-0.77 7.05-2v-1.07c0-.44-.54-.66-.85-.35l-1.64-1.64z"></path>
          </svg>
          HMK홀딩스 Agent
        </div>
        <nav className="space-y-2">
          <NavItem label="지식검색" isActive={activeTab === '지식검색'} onClick={() => setActiveTab('지식검색')} />
          <NavItem label="에이전트" isActive={activeTab === '에이전트'} onClick={() => setActiveTab('에이전트')} />
          <NavItem label="관리자" isActive={activeTab === '관리자'} onClick={() => setActiveTab('관리자')} />
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
