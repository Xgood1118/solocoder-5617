import React, { useState } from 'react';
import { useReaderStore } from '../stores/useReaderStore';
import { Toc } from './Toc';
import { NotePanel } from './NotePanel';
import { BookmarkPanel } from './BookmarkPanel';
import { SearchPanel } from './SearchPanel';

type SidebarTab = 'toc' | 'bookmarks' | 'notes' | 'search';

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, activeSidebarTab, setActiveSidebarTab } = useReaderStore();
  const activeTab: SidebarTab = activeSidebarTab;
  const setActiveTab = (tab: SidebarTab) => setActiveSidebarTab(tab);
  const [collapsed, setCollapsed] = useState(false);

  const tabs: { key: SidebarTab; label: string; icon: string }[] = [
    { key: 'toc', label: '目录', icon: '📑' },
    { key: 'bookmarks', label: '书签', icon: '🔖' },
    { key: 'notes', label: '笔记', icon: '📝' },
    { key: 'search', label: '搜索', icon: '🔍' },
  ];

  const sidebarStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100vh',
    width: collapsed ? '56px' : '320px',
    backgroundColor: 'var(--bg-color)',
    borderRight: '1px solid var(--border-color)',
    zIndex: 150,
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    boxShadow: collapsed ? 'none' : '2px 0 12px rgba(0,0,0,0.08)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: collapsed ? '12px 8px' : '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    minHeight: '56px',
  };

  const toggleBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--text-color)',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px 8px',
    borderRadius: '4px',
  };

  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
  };

  const getTabStyle = (tab: SidebarTab): React.CSSProperties => ({
    flex: 1,
    padding: collapsed ? '12px 0' : '10px 8px',
    border: 'none',
    background: activeTab === tab
      ? 'color-mix(in srgb, var(--bg-color) 85%, var(--accent-color) 15%)'
      : 'transparent',
    color: activeTab === tab ? 'var(--accent-color)' : 'var(--text-color)',
    cursor: 'pointer',
    fontSize: collapsed ? '18px' : '13px',
    borderBottom: activeTab === tab ? '2px solid var(--accent-color)' : '2px solid transparent',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: collapsed ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: collapsed ? '2px' : '6px',
    opacity: activeTab === tab ? 1 : 0.7,
  });

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    display: collapsed ? 'none' : 'block',
  };

  if (!sidebarOpen) return null;

  return (
    <div style={sidebarStyle}>
      <div style={headerStyle}>
        {!collapsed && (
          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-color)' }}>
            {tabs.find((t) => t.key === activeTab)?.label}
          </div>
        )}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            style={toggleBtnStyle}
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? '展开' : '折叠'}
          >
            {collapsed ? '→' : '←'}
          </button>
          <button
            style={toggleBtnStyle}
            onClick={toggleSidebar}
            title="关闭"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={tabsStyle}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            style={getTabStyle(tab.key)}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span>
            {!collapsed && <span>{tab.label}</span>}
          </button>
        ))}
      </div>

      <div style={contentStyle}>
        {activeTab === 'toc' && <Toc />}
        {activeTab === 'bookmarks' && <BookmarkPanel />}
        {activeTab === 'notes' && <NotePanel />}
        {activeTab === 'search' && <SearchPanel />}
      </div>
    </div>
  );
};
