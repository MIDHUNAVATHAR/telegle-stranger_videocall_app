import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const MOCKUPS_DIR = path.join(ROOT_DIR, 'design/mockups');
const ASSETS_DIR = path.join(ROOT_DIR, 'design/assets');
const TEMP_DIR = path.join(ROOT_DIR, 'design/render/temp_html');

if (!fs.existsSync(MOCKUPS_DIR)) fs.mkdirSync(MOCKUPS_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Load base64 images
const getImageBase64 = (filename) => {
  const filePath = path.join(ASSETS_DIR, filename);
  if (fs.existsSync(filePath)) {
    return `data:image/jpeg;base64,${fs.readFileSync(filePath).toString('base64')}`;
  }
  return '';
};

const elenaImg = getImageBase64('elena.jpg');
const alexImg = getImageBase64('alex.jpg');
const marcusImg = getImageBase64('marcus.jpg');
const priyaImg = getImageBase64('priya.jpg');
const davidImg = getImageBase64('david.jpg');

// Shared CSS with new Electric Tangerine / Sunset Flame palette and anti-slop rules
const baseStyles = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  :root {
    --bg-dark: #080B12;
    --bg-surface: #101624;
    --bg-elevated: #161F33;
    --bg-input: #141B2D;
    --border-subtle: #202B3F;
    --border-strong: #2D3D5A;
    --text-main: #F8FAFC;
    --text-muted: #94A3B8;
    --text-dim: #64748B;
    /* New Vibrant Sunset Flame / Tangerine Accent (Eliminates adult webcam pink) */
    --accent: #FF5A1F;
    --accent-hover: #E84D15;
    --accent-subtle: rgba(255, 90, 31, 0.12);
    --gold: #F59E0B;
    --gold-subtle: rgba(245, 158, 11, 0.15);
    --emerald: #10B981;
    --emerald-subtle: rgba(16, 185, 129, 0.12);
    --danger: #EF4444;
  }
  body {
    background: var(--bg-dark);
    color: var(--text-main);
    width: 412px;
    height: 892px;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  /* Status Bar */
  .status-bar {
    height: 48px;
    padding: 12px 24px 0 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-main);
    z-index: 100;
  }
  .status-bar-icons {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dynamic-island {
    width: 108px;
    height: 28px;
    background: #000;
    border-radius: 20px;
    position: absolute;
    left: 50%;
    top: 10px;
    transform: translateX(-50%);
  }
  /* Bottom Nav */
  .bottom-nav {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 82px;
    background: #0A0F1A;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding-bottom: 14px;
    z-index: 90;
  }
  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: var(--text-dim);
    text-decoration: none;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .nav-item.active {
    color: var(--accent);
    font-weight: 700;
  }
  .nav-item svg {
    width: 22px;
    height: 22px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .home-indicator {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 132px;
    height: 4px;
    background: #475569;
    border-radius: 2px;
  }
  /* Brand Badge */
  .brand-logo-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .logo-icon-box {
    width: 34px;
    height: 34px;
    background: linear-gradient(135deg, #FF5A1F, #FF7E40);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 800;
    font-size: 18px;
    box-shadow: 0 4px 14px rgba(255, 90, 31, 0.4);
  }
  .brand-text {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-main);
  }
  .brand-text span {
    color: var(--accent);
  }
  .coin-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    color: var(--gold);
  }
  .coin-pill .plus-btn {
    width: 18px;
    height: 18px;
    background: var(--gold);
    color: #000;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 900;
    line-height: 1;
  }
  .btn-primary {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 14px;
    height: 52px;
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(255, 90, 31, 0.35);
    text-decoration: none;
  }
  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-main);
    border: 1px solid var(--border-subtle);
    border-radius: 14px;
    height: 50px;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
  }
  /* Safety & Respect Community Badges (Replaces 18+ explicit badge) */
  .safety-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: #34D399;
    background: rgba(16, 185, 129, 0.1);
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid rgba(16, 185, 129, 0.25);
  }
  .rule-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.06);
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
`;

const renderNav = (activeTab) => `
  <nav class="bottom-nav">
    <div class="nav-item ${activeTab === 'home' ? 'active' : ''}">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
      <span>Home</span>
    </div>
    <div class="nav-item ${activeTab === 'messages' ? 'active' : ''}">
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      <span>Messages</span>
    </div>
    <div class="nav-item ${activeTab === 'wallet' ? 'active' : ''}">
      <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line><circle cx="17" cy="15" r="1.5"></circle></svg>
      <span>Wallet</span>
    </div>
    <div class="nav-item ${activeTab === 'profile' ? 'active' : ''}">
      <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      <span>Profile</span>
    </div>
    <div class="home-indicator"></div>
  </nav>
`;

const renderStatusBar = () => `
  <div class="status-bar">
    <span>9:41</span>
    <div class="dynamic-island"></div>
    <div class="status-bar-icons">
      <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
        <rect x="0" y="8" width="3" height="6" rx="1"/>
        <rect x="5" y="5" width="3" height="9" rx="1"/>
        <rect x="10" y="2" width="3" height="12" rx="1"/>
        <rect x="15" y="0" width="3" height="14" rx="1"/>
      </svg>
      <svg width="16" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
      <svg width="22" height="12" viewBox="0 0 24 12" fill="currentColor">
        <rect x="0" y="0" width="20" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <rect x="2" y="2" width="13" height="8" rx="1.5"/>
        <rect x="22" y="4" width="2" height="4" rx="1"/>
      </svg>
    </div>
  </div>
`;

export { baseStyles, renderNav, renderStatusBar, elenaImg, alexImg, marcusImg, priyaImg, davidImg, TEMP_DIR, MOCKUPS_DIR };
