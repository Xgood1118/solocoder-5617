import React from 'react';
import { useReaderStore } from '../stores/useReaderStore';
import type { ReaderTheme, FontFamily, ReadingMode, PageAnimation } from '../types';

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, settingsOpen, toggleSettings } = useReaderStore();

  const themes: { key: ReaderTheme; label: string; bg: string; text: string; accent: string }[] = [
    { key: 'light', label: '明亮', bg: '#ffffff', text: '#333333', accent: '#4a90d9' },
    { key: 'sepia', label: '护眼', bg: '#f4ecd8', text: '#5b4636', accent: '#8b7355' },
    { key: 'dark', label: '暗黑', bg: '#1a1a2e', text: '#e0e0e0', accent: '#64b5f6' },
    { key: 'night', label: '夜间', bg: '#000000', text: '#a0a0a0', accent: '#4a90d9' },
  ];

  const fontSizeOptions: { key: string; label: string; px: string }[] = [
    { key: 'sm', label: '小', px: '14px' },
    { key: 'md', label: '中', px: '16px' },
    { key: 'lg', label: '大', px: '18px' },
    { key: 'xl', label: '特大', px: '20px' },
  ];

  const fontFamilyOptions: { key: FontFamily; label: string }[] = [
    { key: 'serif', label: '衬线体' },
    { key: 'sans-serif', label: '无衬线' },
    { key: 'song', label: '宋体' },
    { key: 'source-han-sans', label: '思源黑体' },
    { key: 'monospace', label: '等宽字体' },
  ];

  const lineHeightOptions: { key: string; label: string; value: number }[] = [
    { key: 'tight', label: '紧凑', value: 1.3 },
    { key: 'normal', label: '标准', value: 1.6 },
    { key: 'loose', label: '宽松', value: 2.0 },
  ];

  if (!settingsOpen) return null;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    right: 0,
    top: 0,
    height: '100vh',
    width: '360px',
    maxWidth: '100vw',
    backgroundColor: 'var(--bg-color)',
    borderLeft: '1px solid var(--border-color)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    animation: 'slideInRight 0.3s ease',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--accent-color)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--border-color);
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent-color);
          cursor: pointer;
          transition: transform 0.15s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-color)' }}>
          ⚙️ 阅读设置
        </div>
        <button
          onClick={toggleSettings}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-color)',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🎨 主题</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {themes.map((theme) => (
              <button
                key={theme.key}
                onClick={() => updateSettings({ theme: theme.key })}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border:
                    settings.theme === theme.key
                      ? '2px solid var(--accent-color)'
                      : '2px solid var(--border-color)',
                  backgroundColor: theme.bg,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  transform: settings.theme === theme.key ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '4px',
                    backgroundColor: theme.bg,
                    border: `1px solid ${theme.accent}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: theme.text,
                    lineHeight: 1.4,
                    padding: '4px',
                  }}
                >
                  Aa 示例文本
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: theme.text,
                  }}
                >
                  {theme.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>📏 字体大小</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {fontSizeOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => updateSettings({ fontSize: option.key })}
                style={{
                  padding: '10px 8px',
                  borderRadius: '6px',
                  border:
                    settings.fontSize === option.key
                      ? '2px solid var(--accent-color)'
                      : '1px solid var(--border-color)',
                  backgroundColor:
                    settings.fontSize === option.key
                      ? 'color-mix(in srgb, var(--bg-color) 85%, var(--accent-color) 15%)'
                      : 'transparent',
                  color:
                    settings.fontSize === option.key
                      ? 'var(--accent-color)'
                      : 'var(--text-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: settings.fontSize === option.key ? 600 : 400,
                }}
              >
                <span style={{ fontSize: option.px }}>Aa</span>
                <span style={{ fontSize: '11px' }}>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🔤 字体类型</div>
          <select
            value={settings.fontFamily}
            onChange={(e) => updateSettings({ fontFamily: e.target.value as FontFamily })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-color)',
              color: 'var(--text-color)',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {fontFamilyOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>📐 行间距</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {lineHeightOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => updateSettings({ lineHeight: option.value })}
                style={{
                  padding: '10px 8px',
                  borderRadius: '6px',
                  border:
                    settings.lineHeight === option.value
                      ? '2px solid var(--accent-color)'
                      : '1px solid var(--border-color)',
                  backgroundColor:
                    settings.lineHeight === option.value
                      ? 'color-mix(in srgb, var(--bg-color) 85%, var(--accent-color) 15%)'
                      : 'transparent',
                  color:
                    settings.lineHeight === option.value
                      ? 'var(--accent-color)'
                      : 'var(--text-color)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: settings.lineHeight === option.value ? 600 : 400,
                }}
              >
                <div style={{ lineHeight: option.value, fontSize: '10px', marginBottom: '2px' }}>
                  示例<br />文本
                </div>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <div
            style={{
              ...sectionTitleStyle,
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span>↕️ 段间距</span>
            <span style={{ opacity: 0.7 }}>{settings.paragraphSpacing}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            step={2}
            value={settings.paragraphSpacing}
            onChange={(e) => updateSettings({ paragraphSpacing: Number(e.target.value) })}
          />
        </div>

        <div style={sectionStyle}>
          <div
            style={{
              ...sectionTitleStyle,
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span>☀️ 亮度</span>
            <span style={{ opacity: 0.7 }}>{settings.brightness}%</span>
          </div>
          <input
            type="range"
            min={30}
            max={150}
            step={5}
            value={settings.brightness}
            onChange={(e) => updateSettings({ brightness: Number(e.target.value) })}
          />
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>📖 阅读模式</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {(['page', 'scroll'] as ReadingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => updateSettings({ readingMode: mode })}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border:
                    settings.readingMode === mode
                      ? '2px solid var(--accent-color)'
                      : '1px solid var(--border-color)',
                  backgroundColor:
                    settings.readingMode === mode
                      ? 'color-mix(in srgb, var(--bg-color) 85%, var(--accent-color) 15%)'
                      : 'transparent',
                  color:
                    settings.readingMode === mode
                      ? 'var(--accent-color)'
                      : 'var(--text-color)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: settings.readingMode === mode ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {mode === 'page' ? '📄 单页模式' : '📜 滚动模式'}
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>👆 翻页方式</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { key: 'tapToTurn', label: '点击左右区域翻页', icon: '🖱️' },
              { key: 'swipeToTurn', label: '滑动翻页（触摸设备）', icon: '👋' },
              { key: 'keyboardNavigation', label: '键盘方向键翻页', icon: '⌨️' },
            ].map((item) => {
              const key = item.key as keyof typeof settings;
              const checked = Boolean(settings[key]);
              return (
              <label
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor:
                    checked
                      ? 'color-mix(in srgb, var(--bg-color) 92%, var(--accent-color) 8%)'
                      : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    updateSettings({ [key]: e.target.checked } as Partial<typeof settings>)
                  }
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--accent-color)',
                  }}
                />
                <span style={{ fontSize: '13px' }}>
                  {item.icon} {item.label}
                </span>
              </label>
            );})}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>✨ 转场动画</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {(['slide', 'flip', 'none'] as PageAnimation[]).map((anim) => (
              <button
                key={anim}
                onClick={() => updateSettings({ pageAnimation: anim })}
                style={{
                  padding: '10px 6px',
                  borderRadius: '6px',
                  border:
                    settings.pageAnimation === anim
                      ? '2px solid var(--accent-color)'
                      : '1px solid var(--border-color)',
                  backgroundColor:
                    settings.pageAnimation === anim
                      ? 'color-mix(in srgb, var(--bg-color) 85%, var(--accent-color) 15%)'
                      : 'transparent',
                  color:
                    settings.pageAnimation === anim
                      ? 'var(--accent-color)'
                      : 'var(--text-color)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: settings.pageAnimation === anim ? 600 : 400,
                }}
              >
                {anim === 'slide' ? '↔️ 滑动' : anim === 'flip' ? '📖 翻页' : '🚫 无'}
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>📝 笔记显示</div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: settings.showMarginNotes
                ? 'color-mix(in srgb, var(--bg-color) 92%, var(--accent-color) 8%)'
                : 'transparent',
            }}
          >
            <input
              type="checkbox"
              checked={settings.showMarginNotes}
              onChange={(e) => updateSettings({ showMarginNotes: e.target.checked })}
              style={{
                width: '16px',
                height: '16px',
                accentColor: 'var(--accent-color)',
              }}
            />
            <span style={{ fontSize: '13px' }}>💡 在页面旁显示笔记和高亮</span>
          </label>
        </div>
      </div>
    </div>
  );
};
