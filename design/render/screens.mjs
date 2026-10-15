import path from 'path';
import { baseStyles, renderNav, renderStatusBar, elenaImg, alexImg, marcusImg, priyaImg, davidImg, MOCKUPS_DIR } from './base.mjs';

export const screens = {
  // Screen 1A: Email Login
  '01-email-login': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${baseStyles}
    .auth-container {
      flex: 1;
      padding: 24px 24px 32px 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .brand-hero {
      margin-top: 40px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .hero-logo-large {
      width: 76px;
      height: 76px;
      background: linear-gradient(135deg, #FF5A1F 0%, #FF7E40 100%);
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      margin-bottom: 20px;
      box-shadow: 0 12px 32px rgba(255, 90, 31, 0.45);
    }
    .brand-title {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--text-main);
      margin-bottom: 6px;
    }
    .brand-title span {
      color: var(--accent);
    }
    .brand-tagline {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 24px;
    }
    .hero-h1 {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.25;
      color: var(--text-main);
      margin-bottom: 8px;
    }
    .hero-desc {
      font-size: 15px;
      line-height: 1.45;
      color: var(--text-muted);
      max-width: 320px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .input-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .input-box {
      width: 100%;
      height: 52px;
      background: var(--bg-input);
      border: 1.5px solid var(--border-subtle);
      border-radius: 14px;
      padding: 0 16px;
      font-size: 16px;
      color: var(--text-main);
      outline: none;
      display: flex;
      align-items: center;
    }
    .input-box.focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.18);
    }
    .divider-row {
      display: flex;
      align-items: center;
      margin: 20px 0;
      color: var(--text-dim);
      font-size: 13px;
      font-weight: 500;
    }
    .divider-row::before, .divider-row::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-subtle);
    }
    .divider-row span {
      padding: 0 12px;
    }
    .btn-google {
      background: #FFFFFF;
      color: #0F172A;
      border: none;
      border-radius: 14px;
      height: 52px;
      font-size: 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
    }
    .legal-footer {
      text-align: center;
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-dim);
      margin-top: 24px;
    }
    .legal-footer a {
      color: var(--text-muted);
      text-decoration: underline;
    }
  </style>
</head>
<body>
  ${renderStatusBar()}
  <div class="auth-container">
    <div class="brand-hero">
      <div class="hero-logo-large">🫏</div>
      <h1 class="brand-title">Donkey<span>Play</span></h1>
      <p class="brand-tagline">Chat · Connect · Play</p>
      <h2 class="hero-h1">Real People. Safe & Fun.</h2>
      <p class="hero-desc">Instant 1-on-1 random video connections. Meet verified, friendly people worldwide in a safe space.</p>
    </div>

    <div class="auth-card">
      <div class="form-group">
        <label class="input-label">Email address</label>
        <div class="input-box focus">
          <span>alex.morgan@gmail.com</span>
        </div>
      </div>
      <button class="btn-primary" style="width: 100%;">
        <span>Continue with Email</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      </button>

      <div class="divider-row">
        <span>or</span>
      </div>

      <button class="btn-google" style="width: 100%;">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Continue with Google</span>
      </button>

      <div class="legal-footer">
        <div style="margin-bottom: 8px;">
          <span class="safety-badge">🛡️ Strictly No Nudity · Respect Others</span>
        </div>
        By continuing, you agree to our <a href="#">Community Guidelines</a> & <a href="#">Privacy Policy</a>.
        Account created automatically on first sign-in.
      </div>
    </div>
  </div>
  <div class="home-indicator"></div>
</body>
</html>
`,

  // Screen 1B: Email OTP
  '02-email-otp': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${baseStyles}
    .otp-container {
      flex: 1;
      padding: 24px 24px 32px 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .top-action-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .back-btn {
      width: 40px;
      height: 40px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-main);
      cursor: pointer;
    }
    .otp-header {
      margin-bottom: 32px;
    }
    .otp-badge {
      width: 56px;
      height: 56px;
      background: var(--accent-subtle);
      border: 1px solid rgba(255, 90, 31, 0.3);
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      color: var(--accent);
      margin-bottom: 20px;
    }
    .otp-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .otp-subtitle {
      font-size: 15px;
      line-height: 1.45;
      color: var(--text-muted);
    }
    .otp-email-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      font-weight: 600;
      color: var(--text-main);
    }
    .edit-email-btn {
      color: var(--accent);
      font-size: 13px;
      text-decoration: underline;
      cursor: pointer;
    }
    .otp-boxes {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 32px 0 24px 0;
    }
    .otp-digit {
      flex: 1;
      height: 58px;
      background: var(--bg-input);
      border: 1.5px solid var(--border-subtle);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
      color: var(--text-main);
    }
    .otp-digit.filled {
      border-color: #334155;
      background: var(--bg-surface);
    }
    .otp-digit.active {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.2);
    }
    .cursor-bar {
      width: 2px;
      height: 24px;
      background: var(--accent);
    }
    .resend-box {
      text-align: center;
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }
    .resend-box strong {
      color: var(--text-main);
    }
    .security-note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-dim);
      margin-top: 16px;
    }
  </style>
</head>
<body>
  ${renderStatusBar()}
  <div class="otp-container">
    <div>
      <div class="top-action-bar">
        <div class="back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </div>
        <span style="font-size: 15px; font-weight: 600; color: var(--text-muted);">Account Verification</span>
      </div>

      <div class="otp-header">
        <div class="otp-badge">✉️</div>
        <h1 class="otp-title">Verify your email</h1>
        <p class="otp-subtitle">We sent a 6-digit confirmation code to</p>
        <div class="otp-email-row">
          <span>alex.morgan@gmail.com</span>
          <span class="edit-email-btn">Edit email</span>
        </div>
      </div>

      <div class="otp-boxes">
        <div class="otp-digit filled">4</div>
        <div class="otp-digit filled">9</div>
        <div class="otp-digit filled">2</div>
        <div class="otp-digit active"><div class="cursor-bar"></div></div>
        <div class="otp-digit"></div>
        <div class="otp-digit"></div>
      </div>

      <div class="resend-box">
        Didn't receive it? Resend in <strong>0:42</strong>
      </div>
    </div>

    <div>
      <button class="btn-primary" style="width: 100%;">
        <span>Verify & Continue</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </button>

      <div class="security-note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        <span>Passwordless authentication · Safe & verified access</span>
      </div>
    </div>
  </div>
  <div class="home-indicator"></div>
</body>
</html>
`,

  // Screen 2A: Home Idle
  '03-home-idle': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${baseStyles}
    .home-header {
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .home-content {
      flex: 1;
      padding: 24px 20px 96px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      position: relative;
    }
    .online-counter-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--emerald);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--emerald);
    }
    /* Giant Magnetic Center Button */
    .radar-wrapper {
      position: relative;
      width: 280px;
      height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 16px 0;
    }
    .radar-ring {
      position: absolute;
      border-radius: 50%;
      border: 1.5px solid rgba(255, 90, 31, 0.25);
    }
    .radar-ring.r1 { width: 280px; height: 280px; border-color: rgba(255, 90, 31, 0.08); background: radial-gradient(circle, rgba(255,90,31,0.05) 0%, transparent 70%); }
    .radar-ring.r2 { width: 220px; height: 220px; border-color: rgba(255, 90, 31, 0.18); }
    .radar-ring.r3 { width: 170px; height: 170px; border-color: rgba(255, 90, 31, 0.35); }
    
    .start-matching-btn {
      width: 136px;
      height: 136px;
      background: linear-gradient(135deg, #FF5A1F 0%, #FF7E40 100%);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 16px 36px rgba(255, 90, 31, 0.5), 0 0 0 8px rgba(255, 90, 31, 0.18);
      cursor: pointer;
      z-index: 10;
      border: 2px solid rgba(255, 255, 255, 0.25);
    }
    .start-matching-btn svg {
      width: 38px;
      height: 38px;
      stroke: #fff;
      fill: none;
      stroke-width: 2;
      margin-bottom: 4px;
    }
    .btn-label {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .sub-prompt {
      font-size: 19px;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 6px;
    }
    .sub-explain {
      font-size: 14px;
      color: var(--text-muted);
      max-width: 300px;
      line-height: 1.45;
    }
    .status-summary-card {
      width: 100%;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      text-align: left;
    }
    .status-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .status-avatar-circle {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      object-fit: cover;
      border: 2px solid var(--border-subtle);
    }
    .status-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }
    .status-role {
      font-size: 12px;
      color: var(--emerald);
      display: flex;
      align-items: center;
      gap: 4px;
    }
  </style>
</head>
<body>
  ${renderStatusBar()}
  
  <header class="home-header">
    <div class="brand-logo-row">
      <div class="logo-icon-box">🫏</div>
      <div class="brand-text">Donkey<span>Play</span></div>
    </div>
    <div class="coin-pill">
      <span>🪙 120 Coins</span>
      <div class="plus-btn">+</div>
    </div>
  </header>

  <main class="home-content">
    <div class="online-counter-pill">
      <div class="pulse-dot"></div>
      <span>1,480 People Connected Now</span>
    </div>

    <div>
      <div class="radar-wrapper">
        <div class="radar-ring r1"></div>
        <div class="radar-ring r2"></div>
        <div class="radar-ring r3"></div>
        <div class="start-matching-btn">
          <svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 7 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          <div class="btn-label">START</div>
        </div>
      </div>
      <h2 class="sub-prompt">Tap to Match Instantly</h2>
      <p class="sub-explain">Random 1-on-1 live video discovery. Strictly no nudity. Respect others and connect safely.</p>
    </div>

    <div class="status-summary-card">
      <div class="status-left">
        <img class="status-avatar-circle" src="${alexImg}" alt="Avatar">
        <div>
          <div class="status-name">Alex, 26</div>
          <div class="status-role">
            <span style="display:inline-block; width:6px; height:6px; background:var(--emerald); border-radius:50%;"></span>
            Camera & Mic Ready
          </div>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="safety-badge">🛡️ Safe & Moderated</span>
      </div>
    </div>
  </main>

  ${renderNav('home')}
</body>
</html>
`,

  // Screen 2B (Part 1): Matching Loading
  '04-matching-loading': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${baseStyles}
    .matching-header {
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .matching-content {
      flex: 1;
      padding: 40px 24px 96px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
    }
    .sonar-box {
      position: relative;
      width: 260px;
      height: 260px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 30px 0;
    }
    .sonar-wave {
      position: absolute;
      border-radius: 50%;
      border: 2px solid var(--accent);
      opacity: 0.35;
    }
    .w1 { width: 260px; height: 260px; opacity: 0.12; }
    .w2 { width: 200px; height: 200px; opacity: 0.25; }
    .w3 { width: 150px; height: 150px; opacity: 0.45; }
    
    .searching-avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--accent);
      box-shadow: 0 0 28px rgba(255, 90, 31, 0.45);
      z-index: 5;
    }
    .loading-title {
      font-size: 24px;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 8px;
    }
    .loading-desc {
      font-size: 15px;
      color: var(--text-muted);
      line-height: 1.45;
      max-width: 300px;
    }
    .filter-tags-row {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
    .filter-tag {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .btn-cancel {
      width: 100%;
      max-width: 240px;
      height: 48px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 999px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
    }
  </style>
</head>
<body>
  ${renderStatusBar()}

  <header class="matching-header">
    <div class="brand-logo-row">
      <div class="logo-icon-box">🫏</div>
      <div class="brand-text">Donkey<span>Play</span></div>
    </div>
    <div class="coin-pill">
      <span>🪙 120 Coins</span>
      <div class="plus-btn">+</div>
    </div>
  </header>

  <main class="matching-content">
    <div>
      <div class="sonar-box">
        <div class="sonar-wave w1"></div>
        <div class="sonar-wave w2"></div>
        <div class="sonar-wave w3"></div>
        <img class="searching-avatar" src="${alexImg}" alt="You">
      </div>

      <h1 class="loading-title">Finding someone fun...</h1>
      <p class="loading-desc">Matching with available community members. Be friendly and respectful!</p>

      <div class="filter-tags-row">
        <span class="filter-tag">🌍 Global</span>
        <span class="filter-tag">⚡ Good Karma</span>
        <span class="filter-tag">🛡️ Strictly No Nudity</span>
      </div>
    </div>

    <button class="btn-cancel">
      <span>Cancel Search</span>
    </button>
  </main>

  ${renderNav('home')}
</body>
</html>
`,

  // Screen 2B (Part 2): Matching Result
  '05-matching-result': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${baseStyles}
    .result-header {
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .result-content {
      flex: 1;
      padding: 16px 20px 96px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .match-banner {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34D399;
      font-size: 13px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 999px;
      margin: 0 auto 12px auto;
    }
    /* Profile Photo Card */
    .profile-card {
      position: relative;
      width: 100%;
      height: 440px;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      border: 1px solid var(--border-strong);
    }
    .profile-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .card-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      padding: 24px 20px 20px 20px;
      background: linear-gradient(180deg, transparent 0%, rgba(8, 11, 18, 0.85) 40%, rgba(8, 11, 18, 0.98) 100%);
    }
    .user-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .user-name {
      font-size: 26px;
      font-weight: 800;
      color: #fff;
    }
    .badge-verified {
      background: #3B82F6;
      color: #fff;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
    }
    .user-location {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .user-bio {
      font-size: 14px;
      color: var(--text-main);
      line-height: 1.4;
      margin-bottom: 12px;
    }
    .interest-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tag {
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
    }
    /* Action Buttons */
    .actions-group {
      display: flex;
      gap: 12px;
      margin-top: 14px;
    }
    .btn-skip {
      flex: 1;
      height: 52px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
    }
    .btn-connect {
      flex: 2;
      height: 52px;
      background: var(--accent);
      border: none;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 8px 24px rgba(255, 90, 31, 0.4);
      cursor: pointer;
    }
  </style>
</head>
<body>
  ${renderStatusBar()}

  <header class="result-header">
    <div class="brand-logo-row">
      <div class="logo-icon-box">🫏</div>
      <div class="brand-text">Donkey<span>Play</span></div>
    </div>
    <div class="coin-pill">
      <span>🪙 120 Coins</span>
      <div class="plus-btn">+</div>
    </div>
  </header>

  <main class="result-content">
    <div style="text-align: center;">
      <div class="match-banner">
        <span>✨ Match Found! Connect now</span>
      </div>

      <div class="profile-card">
        <img src="${elenaImg}" alt="Elena">
        <div class="card-overlay">
          <div class="user-name-row">
            <span class="user-name">Elena, 24</span>
            <span class="badge-verified">✓</span>
            <span class="safety-badge" style="margin-left: auto;">🛡️ Verified</span>
          </div>
          <div class="user-location">📍 New Delhi · 12 km away</div>
          <div class="user-bio">"Coffee lover, indie guitar & spontaneous road trips. Say hi!"</div>
          <div class="interest-tags">
            <span class="tag">🎵 Music</span>
            <span class="tag">☕ Specialty Coffee</span>
            <span class="tag">✈️ Travel</span>
          </div>
        </div>
      </div>
    </div>

    <div class="actions-group">
      <button class="btn-skip">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 4 15 12 5 20"></polyline><line x1="19" y1="5" x2="19" y2="19"></line></svg>
        <span>Skip Match</span>
      </button>
      <button class="btn-connect">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="23 7 16 12 23 7 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        <span>Start Call</span>
      </button>
    </div>
  </main>

  ${renderNav('home')}
</body>
</html>
`,

  // Screen 3: Messages
  '06-messages': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${baseStyles}
    .messages-header {
      padding: 16px 20px 12px 20px;
    }
    .header-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .messages-title {
      font-size: 24px;
      font-weight: 800;
      color: var(--text-main);
    }
    .ephemeral-notice-banner {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 12px;
      line-height: 1.4;
      color: #FBBF24;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .search-box {
      width: 100%;
      height: 44px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 0 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-muted);
      font-size: 14px;
    }
    .filter-tabs {
      display: flex;
      gap: 8px;
      padding: 8px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .filter-pill {
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
    }
    .filter-pill.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    /* Connection List */
    .connections-list {
      flex: 1;
      padding: 10px 20px 96px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .connection-item {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .conn-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar-wrapper {
      position: relative;
      width: 48px;
      height: 48px;
    }
    .conn-avatar {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      object-fit: cover;
    }
    .online-indicator-dot {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 12px;
      height: 12px;
      background: var(--emerald);
      border: 2px solid var(--bg-surface);
      border-radius: 50%;
    }
    .conn-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 2px;
    }
    .conn-meta {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-call-back {
      width: 38px;
      height: 38px;
      background: var(--accent-subtle);
      border: 1px solid rgba(255, 90, 31, 0.3);
      border-radius: 12px;
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
  </style>
</head>
<body>
  ${renderStatusBar()}

  <header class="messages-header">
    <div class="header-title-row">
      <h1 class="messages-title">Connected People</h1>
      <span class="safety-badge">🛡️ Safe Network</span>
    </div>

    <div class="ephemeral-notice-banner">
      <span style="font-size: 16px;">💬</span>
      <span><strong>Connection History:</strong> People you met on video chat. Live video chats are ephemeral. Zero tolerance for abusive conduct or harassment.</span>
    </div>

    <div class="search-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <span>Search past connections...</span>
    </div>
  </header>

  <div class="filter-tabs">
    <div class="filter-pill active">All (18)</div>
    <div class="filter-pill">Online Now (6)</div>
    <div class="filter-pill">Favorites (4)</div>
  </div>

  <main class="connections-list">
    <div class="connection-item">
      <div class="conn-left">
        <div class="avatar-wrapper">
          <img class="conn-avatar" src="${elenaImg}" alt="Elena">
          <div class="online-indicator-dot"></div>
        </div>
        <div>
          <div class="conn-name">Elena, 24</div>
          <div class="conn-meta">
            <span>📹 Video call yesterday · 14m</span>
          </div>
        </div>
      </div>
      <div class="btn-call-back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="23 7 16 12 23 7 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
      </div>
    </div>

    <div class="connection-item">
      <div class="conn-left">
        <div class="avatar-wrapper">
          <img class="conn-avatar" src="${marcusImg}" alt="Marcus">
          <div class="online-indicator-dot"></div>
        </div>
        <div>
          <div class="conn-name">Marcus, 28</div>
          <div class="conn-meta">
            <span>📹 Video call 2 days ago · 9m</span>
          </div>
        </div>
      </div>
      <div class="btn-call-back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="23 7 16 12 23 7 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
      </div>
    </div>

    <div class="connection-item">
      <div class="conn-left">
        <div class="avatar-wrapper">
          <img class="conn-avatar" src="${priyaImg}" alt="Priya">
          <div class="online-indicator-dot"></div>
        </div>
        <div>
          <div class="conn-name">Priya, 25</div>
          <div class="conn-meta">
            <span>📹 Video call 4 days ago · 21m</span>
          </div>
        </div>
      </div>
      <div class="btn-call-back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="23 7 16 12 23 7 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
      </div>
    </div>

    <div class="connection-item">
      <div class="conn-left">
        <div class="avatar-wrapper">
          <img class="conn-avatar" src="${davidImg}" alt="David">
        </div>
        <div>
          <div class="conn-name">David, 30</div>
          <div class="conn-meta">
            <span>Last connected 1 week ago</span>
          </div>
        </div>
      </div>
      <div class="btn-call-back" style="opacity: 0.6;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="23 7 16 12 23 7 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
      </div>
    </div>
  </main>

  ${renderNav('messages')}
</body>
</html>
`,

  // Screen 4: Wallet
  '07-wallet': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${baseStyles}
    .wallet-container {
      flex: 1;
      padding: 16px 20px 96px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .wallet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .wallet-title {
      font-size: 24px;
      font-weight: 800;
      color: var(--text-main);
    }
    /* Balances Grid */
    .balances-row {
      display: flex;
      gap: 10px;
    }
    .balance-card {
      flex: 1;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      padding: 14px;
    }
    .balance-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .balance-val {
      font-size: 22px;
      font-weight: 800;
      color: var(--text-main);
    }
    .balance-val.gold {
      color: var(--gold);
    }
    .balance-val.green {
      color: var(--emerald);
    }
    .balance-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    /* Notice Card */
    .wallet-notice {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 11px;
      line-height: 1.4;
      color: var(--text-dim);
    }
    /* Section Title */
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 8px;
    }
    /* Packages Grid */
    .packages-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .package-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 12px 8px;
      text-align: center;
      position: relative;
    }
    .package-card.popular {
      border-color: var(--gold);
      background: rgba(245, 158, 11, 0.06);
    }
    .popular-tag {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--gold);
      color: #000;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .pkg-coins {
      font-size: 16px;
      font-weight: 800;
      color: var(--gold);
      margin-top: 4px;
    }
    .pkg-price {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      margin-top: 4px;
    }
    /* Payout / Withdrawal Card */
    .payout-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      padding: 16px;
    }
    .upi-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: var(--bg-elevated);
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 12px;
    }
    .upi-val {
      font-weight: 700;
      color: var(--text-main);
    }
    .withdraw-input-box {
      display: flex;
      align-items: center;
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      height: 48px;
      padding: 0 14px;
      margin-bottom: 12px;
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }
    .withdraw-condition {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 8px;
      text-align: center;
    }
  </style>
</head>
<body>
  ${renderStatusBar()}

  <div class="wallet-container">
    <header class="wallet-header">
      <h1 class="wallet-title">Wallet & Earnings</h1>
      <span class="safety-badge">Verified Payouts</span>
    </header>

    <div class="balances-row">
      <div class="balance-card">
        <div class="balance-label">🪙 Coin Balance</div>
        <div class="balance-val gold">120</div>
        <div class="balance-sub">Purchased coins for gifts</div>
      </div>
      <div class="balance-card">
        <div class="balance-label">💵 Withdrawable</div>
        <div class="balance-val green">₹1,450</div>
        <div class="balance-sub">Earned via received gifts</div>
      </div>
    </div>

    <div class="wallet-notice">
      ⚠️ <strong>Policy Notice:</strong> Purchased coins and withdrawable gift earnings are strictly separate. Purchased coins cannot be redeemed for cash.
    </div>

    <div>
      <div class="section-title">Buy Coins</div>
      <div class="packages-grid">
        <div class="package-card">
          <div class="pkg-coins">🪙 100</div>
          <div class="pkg-price">₹99</div>
        </div>
        <div class="package-card popular">
          <div class="popular-tag">Popular</div>
          <div class="pkg-coins">🪙 350</div>
          <div class="pkg-price">₹249</div>
        </div>
        <div class="package-card">
          <div class="pkg-coins">🪙 1,200</div>
          <div class="pkg-price">₹799</div>
        </div>
      </div>
    </div>

    <div>
      <div class="section-title">Withdraw Earnings (UPI)</div>
      <div class="payout-card">
        <div class="upi-row">
          <span>Linked UPI ID:</span>
          <span class="upi-val">alex.morgan@oksbi</span>
          <span style="color: var(--accent); font-size: 12px; text-decoration: underline; cursor: pointer;">Edit</span>
        </div>

        <div class="withdraw-input-box">
          <span style="color: var(--text-muted); margin-right: 6px;">₹</span>
          <span>1,000</span>
        </div>

        <button class="btn-primary" style="width: 100%; height: 46px; font-size: 15px; background: var(--emerald); box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);">
          <span>Withdraw ₹1,000 to UPI</span>
        </button>
        <div class="withdraw-condition">
          Minimum withdrawal amount: ₹500 · 0% fee · Transferred within 24–48h
        </div>
      </div>
    </div>
  </div>

  ${renderNav('wallet')}
</body>
</html>
`,

  // Screen 5: Profile
  '08-profile': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${baseStyles}
    .profile-container {
      flex: 1;
      padding: 16px 20px 96px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .profile-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .profile-title {
      font-size: 24px;
      font-weight: 800;
      color: var(--text-main);
    }
    /* Profile Summary Card */
    .profile-card-main {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .profile-avatar-box {
      position: relative;
      width: 80px;
      height: 80px;
      margin-bottom: 12px;
    }
    .profile-img-large {
      width: 80px;
      height: 80px;
      border-radius: 24px;
      object-fit: cover;
      border: 2px solid var(--border-strong);
    }
    .edit-photo-badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      background: var(--accent);
      color: #fff;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }
    .profile-display-name {
      font-size: 20px;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 2px;
    }
    .profile-details {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .karma-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      color: #34D399;
      margin-bottom: 14px;
    }
    .btn-edit-profile {
      width: 100%;
      height: 42px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
    }
    /* Settings List */
    .menu-group {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      overflow: hidden;
    }
    .menu-item {
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 14px;
      color: var(--text-main);
      cursor: pointer;
    }
    .menu-item:last-child {
      border-bottom: none;
    }
    .menu-item-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .menu-icon {
      font-size: 16px;
    }
    .btn-logout {
      width: 100%;
      height: 46px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 14px;
      font-size: 14px;
      font-weight: 700;
      color: var(--danger);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  ${renderStatusBar()}

  <div class="profile-container">
    <header class="profile-header-row">
      <h1 class="profile-title">Profile & Settings</h1>
      <span class="safety-badge">🛡️ Verified Member</span>
    </header>

    <div class="profile-card-main">
      <div class="profile-avatar-box">
        <img class="profile-img-large" src="${alexImg}" alt="Alex">
        <div class="edit-photo-badge">📷</div>
      </div>
      <div class="profile-display-name">Alex Morgan</div>
      <div class="profile-details">Age 26 · Non-binary · Bengaluru, IN</div>
      <div class="karma-badge">
        <span>⚡ 100 Karma (Clean Community Trust Score)</span>
      </div>
      <button class="btn-edit-profile">Edit Profile Information</button>
    </div>

    <div>
      <div class="menu-group">
        <div class="menu-item">
          <div class="menu-item-left">
            <span class="menu-icon">📹</span>
            <span>Camera & Microphone Access</span>
          </div>
          <span style="color: var(--emerald); font-size: 12px; font-weight: 600;">Granted</span>
        </div>
        <div class="menu-item">
          <div class="menu-item-left">
            <span class="menu-icon">🛡️</span>
            <span>Community Guidelines: Strictly No Nudity</span>
          </div>
          <span style="color: var(--text-dim);">›</span>
        </div>
        <div class="menu-item">
          <div class="menu-item-left">
            <span class="menu-icon">🤝</span>
            <span>Respect & Safe Conduct Policy</span>
          </div>
          <span style="color: var(--text-dim);">›</span>
        </div>
        <div class="menu-item">
          <div class="menu-item-left">
            <span class="menu-icon">🚫</span>
            <span>Blocked Users (0)</span>
          </div>
          <span style="color: var(--text-dim);">›</span>
        </div>
      </div>
    </div>

    <button class="btn-logout">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      <span>Log Out of Donkey Play</span>
    </button>
  </div>

  ${renderNav('profile')}
</body>
</html>
`,

  // Screen 6: Active Video Call
  '09-video-call': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${baseStyles}
    .video-call-screen {
      position: relative;
      width: 412px;
      height: 892px;
      background: #000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    /* Fullscreen Matched Video Feed */
    .main-video-feed {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 1;
    }
    .video-scrim-top {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 140px;
      background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%);
      z-index: 2;
    }
    .video-scrim-bottom {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 250px;
      background: linear-gradient(0deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.5) 60%, transparent 100%);
      z-index: 2;
    }
    /* Top Call Header */
    .call-top-bar {
      position: relative;
      z-index: 10;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .matched-info-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(12px);
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .matched-user-title {
      font-size: 14px;
      font-weight: 700;
      color: #fff;
    }
    .call-timer {
      font-size: 12px;
      color: #34D399;
      font-weight: 600;
    }
    .btn-report {
      background: rgba(239, 68, 68, 0.25);
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #F87171;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
    }
    /* Picture-in-Picture Self Preview */
    /* Carefully placed above bottom control bar, no overlap! */
    .pip-self-view {
      position: absolute;
      right: 18px;
      bottom: 122px;
      width: 100px;
      height: 140px;
      border-radius: 16px;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.4);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      z-index: 15;
    }
    .pip-self-view img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .pip-label {
      position: absolute;
      bottom: 4px;
      left: 6px;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      background: rgba(0, 0, 0, 0.6);
      padding: 2px 6px;
      border-radius: 4px;
    }
    /* Live safety reminder pill */
    .safety-reminder-bar {
      margin: 6px auto 0 auto;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      color: #E2E8F0;
      width: fit-content;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    /* Ephemeral in-call chat bubble */
    .in-call-chat-bubble {
      position: absolute;
      left: 18px;
      bottom: 122px;
      max-width: 250px;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 14px;
      padding: 10px 14px;
      color: #fff;
      font-size: 13px;
      line-height: 1.35;
      z-index: 10;
    }
    .chat-bubble-author {
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 2px;
      font-size: 11px;
    }
    /* Bottom Controls */
    .bottom-call-controls {
      position: relative;
      z-index: 20;
      padding: 0 20px 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .in-call-input-row {
      display: flex;
      gap: 8px;
    }
    .in-call-input {
      flex: 1;
      height: 44px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 999px;
      padding: 0 16px;
      font-size: 14px;
      color: #fff;
      display: flex;
      align-items: center;
    }
    .btn-send-chat {
      width: 44px;
      height: 44px;
      background: var(--accent);
      border-radius: 50%;
      border: none;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .call-action-buttons-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .action-circle-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .btn-gift-trigger {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 50px;
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: #000;
      font-size: 14px;
      font-weight: 800;
      padding: 0 18px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
    }
    .btn-leave-call {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--danger);
      color: #fff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(239, 68, 68, 0.5);
    }
  </style>
</head>
<body>
  <div class="video-call-screen">
    <img class="main-video-feed" src="${elenaImg}" alt="Elena Live Feed">
    <div class="video-scrim-top"></div>
    <div class="video-scrim-bottom"></div>

    <!-- Status & Call Header -->
    <div>
      ${renderStatusBar()}
      <div class="call-top-bar">
        <div class="matched-info-pill">
          <span class="matched-user-title">Elena, 24</span>
          <span style="color: rgba(255,255,255,0.4);">•</span>
          <span class="call-timer">⏱️ 04:18</span>
        </div>
        <div class="btn-report">
          <span>⚠️ Report</span>
        </div>
      </div>
      <div class="safety-reminder-bar">
        <span>🛡️ Strictly no nudity · Respectful conversations only</span>
      </div>
    </div>

    <!-- PiP Self View (Positioned safely above bottom controls) -->
    <div class="pip-self-view">
      <img src="${alexImg}" alt="You">
      <div class="pip-label">You</div>
    </div>

    <!-- Ephemeral In-Call Chat Bubble -->
    <div class="in-call-chat-bubble">
      <div class="chat-bubble-author">Elena</div>
      <div>"Haha that is so cool! Have you traveled there before?"</div>
    </div>

    <!-- Bottom Controls -->
    <div class="bottom-call-controls">
      <div class="in-call-input-row">
        <div class="in-call-input">
          <span style="color: rgba(255,255,255,0.65);">Say something nice...</span>
        </div>
        <div class="btn-send-chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </div>
      </div>

      <div class="call-action-buttons-row">
        <div class="action-circle-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        </div>
        <div class="action-circle-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
        </div>
        <div class="btn-gift-trigger">
          <span style="font-size: 18px;">🎁</span>
          <span>Send Gift</span>
        </div>
        <div class="btn-leave-call">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
        </div>
      </div>
    </div>
    <div class="home-indicator"></div>
  </div>
</body>
</html>
`,

  // Screen 6 (Drawer): Gift Selection
  '10-gift-selection': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${baseStyles}
    .gift-screen {
      position: relative;
      width: 412px;
      height: 892px;
      background: #000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    .bg-video-blur {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: blur(12px) brightness(0.4);
      transform: scale(1.05);
    }
    /* Bottom Sheet */
    .gift-drawer {
      position: relative;
      z-index: 10;
      width: 100%;
      background: #0F1420;
      border-top-left-radius: 28px;
      border-top-right-radius: 28px;
      border-top: 1px solid var(--border-strong);
      padding: 12px 20px 24px 20px;
      box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.7);
    }
    .drawer-handle {
      width: 40px;
      height: 4px;
      background: #475569;
      border-radius: 2px;
      margin: 0 auto 14px auto;
    }
    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .drawer-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--text-main);
    }
    /* Gift Grid */
    .gifts-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .gift-item-card {
      background: var(--bg-surface);
      border: 1.5px solid var(--border-subtle);
      border-radius: 16px;
      padding: 12px 8px;
      text-align: center;
      cursor: pointer;
      position: relative;
    }
    .gift-item-card.selected {
      border-color: var(--gold);
      background: rgba(245, 158, 11, 0.12);
      box-shadow: 0 0 16px rgba(245, 158, 11, 0.25);
    }
    .gift-item-card.locked {
      opacity: 0.5;
    }
    .gift-emoji {
      font-size: 32px;
      margin-bottom: 4px;
    }
    .gift-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 4px;
    }
    .gift-price-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 12px;
      font-weight: 800;
      color: var(--gold);
    }
    .locked-tag {
      position: absolute;
      top: 6px;
      right: 6px;
      font-size: 10px;
    }
    .disclaimer-text {
      text-align: center;
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="gift-screen">
    <img class="bg-video-blur" src="${elenaImg}" alt="Video Blur">

    <div class="gift-drawer">
      <div class="drawer-handle"></div>

      <div class="drawer-header">
        <h2 class="drawer-title">Send a Gift to Elena</h2>
        <div class="coin-pill">
          <span>🪙 120 Coins</span>
          <div class="plus-btn">+</div>
        </div>
      </div>

      <div class="gifts-grid">
        <div class="gift-item-card selected">
          <div class="gift-emoji">🌹</div>
          <div class="gift-name">Red Rose</div>
          <div class="gift-price-badge">🪙 5</div>
        </div>

        <div class="gift-item-card">
          <div class="gift-emoji">🍌</div>
          <div class="gift-name">Banana</div>
          <div class="gift-price-badge">🪙 10</div>
        </div>

        <div class="gift-item-card">
          <div class="gift-emoji">🎈</div>
          <div class="gift-name">Heart Balloon</div>
          <div class="gift-price-badge">🪙 25</div>
        </div>

        <div class="gift-item-card">
          <div class="gift-emoji">🏆</div>
          <div class="gift-name">Donkey Cup</div>
          <div class="gift-price-badge">🪙 50</div>
        </div>

        <div class="gift-item-card">
          <div class="gift-emoji">💎</div>
          <div class="gift-name">Diamond</div>
          <div class="gift-price-badge">🪙 100</div>
        </div>

        <div class="gift-item-card locked">
          <div class="locked-tag">🔒</div>
          <div class="gift-emoji">🚀</div>
          <div class="gift-name">Rocket</div>
          <div class="gift-price-badge">🪙 250</div>
        </div>
      </div>

      <button class="btn-primary" style="width: 100%; height: 50px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #000; font-weight: 800; box-shadow: 0 4px 18px rgba(245, 158, 11, 0.4);">
        <span>Send Red Rose (5 Coins)</span>
      </button>

      <div class="disclaimer-text">
        Virtual gifts directly reward participants. Voluntary, respectful & non-refundable.
      </div>
    </div>
    <div class="home-indicator"></div>
  </div>
</body>
</html>
`,

  // Screen 11: Desktop Presentation Mockup
  '11-desktop-presentation': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    body {
      background: #05070B;
      width: 1440px;
      height: 900px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .ambient-glow {
      position: absolute;
      width: 700px;
      height: 700px;
      background: radial-gradient(circle, rgba(255, 90, 31, 0.12) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    /* Desktop Browser Shell */
    .browser-window {
      width: 1280px;
      height: 800px;
      background: #090D15;
      border: 1px solid #1E293B;
      border-radius: 18px;
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 10;
    }
    .browser-top-bar {
      height: 44px;
      background: #0F141F;
      border-bottom: 1px solid #1E293B;
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 16px;
    }
    .window-dots {
      display: flex;
      gap: 7px;
    }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot.red { background: #EF4444; }
    .dot.yellow { background: #F59E0B; }
    .dot.green { background: #10B981; }
    
    .url-bar {
      flex: 1;
      max-width: 460px;
      height: 28px;
      background: #172033;
      border-radius: 8px;
      display: flex;
      align-items: center;
      padding: 0 12px;
      font-size: 12px;
      color: #94A3B8;
      gap: 6px;
      margin: 0 auto;
    }
    /* Centered Mobile App Frame inside Desktop */
    .browser-viewport {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0A0E18;
      position: relative;
    }
    .mobile-app-shell {
      width: 390px;
      height: 720px;
      background: #080B12;
      border: 2px solid #202B3F;
      border-radius: 36px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    /* Annotations */
    .annotation-card {
      position: absolute;
      background: rgba(16, 22, 36, 0.92);
      border: 1px solid #2D3D5A;
      border-radius: 14px;
      padding: 16px;
      width: 270px;
      color: #F8FAFC;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .annotation-card.left { left: 80px; top: 220px; }
    .annotation-card.right { right: 80px; top: 220px; }
    .ann-title {
      font-size: 14px;
      font-weight: 700;
      color: #FF5A1F;
      margin-bottom: 6px;
    }
    .ann-body {
      font-size: 12px;
      line-height: 1.45;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="ambient-glow"></div>

  <div class="browser-window">
    <div class="browser-top-bar">
      <div class="window-dots">
        <div class="dot red"></div>
        <div class="dot yellow"></div>
        <div class="dot green"></div>
      </div>
      <div class="url-bar">
        <span>🔒</span>
        <span style="color: #F8FAFC; font-weight: 600;">donkeyplay.com</span>
        <span>/app</span>
      </div>
      <div style="font-size: 12px; color: #64748B;">Donkey Play Web</div>
    </div>

    <div class="browser-viewport">
      <!-- Left Callout -->
      <div class="annotation-card left">
        <div class="ann-title">📱 Mobile-First Containment</div>
        <div class="ann-body">On desktop screens, Donkey Play stays focused in a centered 390–430px smartphone column to preserve the intimate 1-on-1 feel and touch-friendly controls.</div>
      </div>

      <!-- Centered Mobile Container -->
      <div class="mobile-app-shell">
        <div style="height: 38px; padding: 10px 18px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #fff;">
          <span>9:41</span>
          <span>5G ●●</span>
        </div>
        <div style="padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1E293B;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 26px; height: 26px; background: #FF5A1F; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">🫏</div>
            <strong style="color: #fff; font-size: 16px;">Donkey<span style="color:#FF5A1F;">Play</span></strong>
          </div>
          <div style="background: #101624; border: 1px solid #202B3F; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; color: #F59E0B;">🪙 120</div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center;">
          <div style="background: #101624; border: 1px solid #202B3F; padding: 6px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; color: #34D399; margin-bottom: 24px;">
            ● 1,480 People Online
          </div>

          <div style="width: 140px; height: 140px; border-radius: 50%; background: linear-gradient(135deg, #FF5A1F, #FF7E40); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; box-shadow: 0 14px 34px rgba(255, 90, 31, 0.45); border: 2px solid rgba(255,255,255,0.3); margin-bottom: 20px;">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polygon points="23 7 16 12 23 7 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            <span style="font-size: 13px; font-weight: 800; margin-top: 4px;">START</span>
          </div>

          <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 4px;">Start Matching</h3>
          <p style="font-size: 13px; color: #94A3B8; max-width: 250px; line-height: 1.4;">Strictly no nudity · Respect others and discover real connections worldwide.</p>
        </div>

        <div style="height: 64px; background: #0A0F1A; border-top: 1px solid #202B3F; display: flex; justify-content: space-around; align-items: center; font-size: 11px; color: #64748B;">
          <span style="color: #FF5A1F; font-weight: 700;">Home</span>
          <span>Messages</span>
          <span>Wallet</span>
          <span>Profile</span>
        </div>
      </div>

      <!-- Right Callout -->
      <div class="annotation-card right">
        <div class="ann-title">🛡️ Respectful Social Platform</div>
        <div class="ann-body">Zero generic SaaS clutter. Clean dark surfaces, warm energetic tangerine accents, strict anti-nudity community standards, and proactive reporting to avoid regulatory issues.</div>
      </div>
    </div>
  </div>
</body>
</html>
`
};
