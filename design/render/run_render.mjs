import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { screens } from './screens.mjs';
import { TEMP_DIR, MOCKUPS_DIR } from './base.mjs';

console.log('--- Starting Donkey Play High-Fidelity Mockup Renderer ---');

// Write out HTML files
for (const [screenName, htmlContent] of Object.entries(screens)) {
  const htmlPath = path.join(TEMP_DIR, `${screenName}.html`);
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
}
console.log('✓ Wrote HTML templates for all screens.');

const chromeBase = 'google-chrome-stable --headless=new --no-sandbox --disable-gpu --disable-extensions --disable-background-networking --disable-sync --disable-default-apps --no-first-run';

const mobileScreens = [
  '01-email-login',
  '02-email-otp',
  '03-home-idle',
  '04-matching-loading',
  '05-matching-result',
  '06-messages',
  '07-wallet',
  '08-profile',
  '09-video-call',
  '10-gift-selection',
];

// 1. Render mobile screens 01 to 10
for (const name of mobileScreens) {
  const outputPath = path.join(MOCKUPS_DIR, `${name}.png`);
  const htmlPath = path.join(TEMP_DIR, `${name}.html`);
  console.log(`Rendering ${name}...`);
  const cmd = `${chromeBase} --screenshot="${outputPath}" --window-size=412,892 --force-device-scale-factor=2 --hide-scrollbars "file://${htmlPath}"`;
  execSync(cmd, { stdio: 'pipe' });
  console.log(`  -> Saved ${outputPath}`);
}

// 2. Render desktop presentation (11)
{
  const name = '11-desktop-presentation';
  const outputPath = path.join(MOCKUPS_DIR, `${name}.png`);
  const htmlPath = path.join(TEMP_DIR, `${name}.html`);
  console.log(`Rendering ${name}...`);
  const cmd = `${chromeBase} --screenshot="${outputPath}" --window-size=1440,900 --force-device-scale-factor=1.5 --hide-scrollbars "file://${htmlPath}"`;
  execSync(cmd, { stdio: 'pipe' });
  console.log(`  -> Saved ${outputPath}`);
}

// 3. Render all screens contact sheet (12)
console.log('Generating contact sheet with rendered screen mockups...');
const b64 = {};
for (const name of mobileScreens) {
  const p = path.join(MOCKUPS_DIR, `${name}.png`);
  if (fs.existsSync(p)) {
    b64[name] = `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
  }
}

const contactSheetHtml = `
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
    }
    body {
      background: #06090F;
      color: #F8FAFC;
      width: 2400px;
      padding: 48px;
    }
    .sheet-header {
      margin-bottom: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #1E293B;
      padding-bottom: 24px;
    }
    .sheet-title {
      font-size: 42px;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .sheet-title span { color: #FF5A1F; }
    .sheet-subtitle {
      font-size: 18px;
      color: #94A3B8;
      margin-top: 6px;
    }
    .flow-row {
      margin-bottom: 48px;
    }
    .row-title {
      font-size: 20px;
      font-weight: 800;
      color: #F59E0B;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .screens-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 24px;
    }
    .mockup-card {
      background: #0A0F1A;
      border: 1.5px solid #202B3F;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
    }
    .mockup-header-bar {
      padding: 12px 16px;
      background: #101624;
      border-bottom: 1px solid #202B3F;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: 700;
      color: #F8FAFC;
    }
    .mockup-img-frame {
      width: 100%;
      height: 780px;
      background: #080B12;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
    }
    .mockup-img-frame img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
  </style>
</head>
<body>
  <div class="sheet-header">
    <div>
      <h1 class="sheet-title">DONKEY<span>PLAY</span> — High-Fidelity UI Design Mockups</h1>
      <p class="sheet-subtitle">Safe Social Discovery, Random Matching & 1-on-1 Video Chat · Zero Nudity & Respect Community Policy</p>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 15px; font-weight: 700; color: #10B981;">🛡️ Strictly No Nudity · Safe & Moderated</div>
      <div style="font-size: 13px; color: #64748B; margin-top: 4px;">Electric Sunset Flame & Obsidian Dark Theme</div>
    </div>
  </div>

  <div class="flow-row">
    <div class="row-title">Phase 1: Onboarding, Discovery & Instant Matching Flow</div>
    <div class="screens-grid">
      <div class="mockup-card">
        <div class="mockup-header-bar">
          <span>01. Email Login</span>
          <span style="color: #64748B;">Auto-Account</span>
        </div>
        <div class="mockup-img-frame">
          <img src="${b64['01-email-login']}" alt="01">
        </div>
      </div>

      <div class="mockup-card">
        <div class="mockup-header-bar">
          <span>02. OTP Verification</span>
          <span style="color: #64748B;">Passwordless</span>
        </div>
        <div class="mockup-img-frame">
          <img src="${b64['02-email-otp']}" alt="02">
        </div>
      </div>

      <div class="mockup-card">
        <div class="mockup-header-bar">
          <span>03. Home / Discovery</span>
          <span style="color: #FF5A1F;">Central Matching</span>
        </div>
        <div class="mockup-img-frame">
          <img src="${b64['03-home-idle']}" alt="03">
        </div>
      </div>

      <div class="mockup-card">
        <div class="mockup-header-bar">
          <span>04. Matching Searching</span>
          <span style="color: #F59E0B;">Radar Animation</span>
        </div>
        <div class="mockup-img-frame">
          <img src="${b64['04-matching-loading']}" alt="04">
        </div>
      </div>

      <div class="mockup-card">
        <div class="mockup-header-bar">
          <span>05. Match Result</span>
          <span style="color: #10B981;">Elena, 24</span>
        </div>
        <div class="mockup-img-frame">
          <img src="${b64['05-matching-result']}" alt="05">
        </div>
      </div>
    </div>
  </div>

  <div class="flow-row">
    <div class="row-title">Phase 2: Connections, 1-on-1 Video Chat, Gifting, Wallet & Profile</div>
    <div class="screens-grid">
      <div class="mockup-card">
        <div class="mockup-header-bar">
          <span>06. Past Connections</span>
          <span style="color: #64748B;">Ephemeral Chat Rule</span>
        </div>
        <div class="mockup-img-frame">
          <img src="${b64['06-messages']}" alt="06">
        </div>
      </div>

      <div class="mockup-card">
        <div class="mockup-header-bar">
          <span>09. Live Video Call</span>
          <span style="color: #FF5A1F;">Safe PiP Layout</span>
        </div>
        <div class="mockup-img-frame">
          <img src="${b64['09-video-call']}" alt="09">
        </div>
      </div>

      <div class="mockup-card">
        <div class="mockup-header-bar">
          <span>10. Gift Selection</span>
          <span style="color: #F59E0B;">Virtual Gifts</span>
        </div>
        <div class="mockup-img-frame">
          <img src="${b64['10-gift-selection']}" alt="10">
        </div>
      </div>

      <div class="mockup-card">
        <div class="mockup-header-bar">
          <span>07. Wallet & Earnings</span>
          <span style="color: #10B981;">Coins & UPI Payout</span>
        </div>
        <div class="mockup-img-frame">
          <img src="${b64['07-wallet']}" alt="07">
        </div>
      </div>

      <div class="mockup-card">
        <div class="mockup-header-bar">
          <span>08. Profile & Settings</span>
          <span style="color: #64748B;">Clean Trust Score</span>
        </div>
        <div class="mockup-img-frame">
          <img src="${b64['08-profile']}" alt="08">
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const contactSheetPath = path.join(TEMP_DIR, '12-all-screens-contact-sheet.html');
fs.writeFileSync(contactSheetPath, contactSheetHtml, 'utf-8');

const contactSheetOutput = path.join(MOCKUPS_DIR, '12-all-screens-contact-sheet.jpg');
console.log('Rendering 12-all-screens-contact-sheet.jpg...');
const cmd = `${chromeBase} --screenshot="${contactSheetOutput}" --window-size=2400,1950 --hide-scrollbars "file://${contactSheetPath}"`;
execSync(cmd, { stdio: 'pipe' });
console.log(`  -> Saved ${contactSheetOutput}`);

console.log('🎉 ALL 12 MOCKUPS SUCCESSFULLY RE-RENDERED WITH NEW PALETTE AND RESPECT COPY!');
