# ContactCache 📱☁️

A lightweight, high-performance contact saving website that can be **installed as an app (PWA)** on any device (Desktop, iOS, and Android). 

Contacts are saved directly to a cloud **JSON Bin** (via [jsonbin.io](https://jsonbin.io)) configured in your `.env` file, allowing seamless real-time **multi-device synchronization** across all your phones, tablets, and computers without any complex database setup.

---

## ✨ Features

- 📲 **Installable as App (PWA)**:
  - Custom branded application icon (192×192, 512×512, maskable, SVG & PNG).
  - Standalone app mode (no browser URL bars, feels like a native mobile/desktop app).
  - Standards-compliant PWA manifest and Service Worker for offline shell caching and fast loading.
- ☁️ **No Database Required — Cloud JSON Bin**:
  - Connects securely to [jsonbin.io](https://jsonbin.io) using `JSONBIN_API_KEY` and `JSONBIN_BIN_ID` purely from `.env`.
  - Zero database maintenance or exposed configuration on the frontend.
  - Graceful fallback: If keys are not set yet, runs in local mode without crashing.
- 🔄 **Real-Time Multi-Device Sync**:
  - Add, edit, or delete a contact on your phone, and it automatically updates on your laptop or tablet.
  - Auto-polling background sync (every 7 seconds) + instant sync when tab/app regains focus.
  - Manual "Sync Now" button with rotating animation and last-synced timestamp.
- 📇 **Four Clean Contact Fields**:
  - **Name** (*Required*)
  - **Mail** (*Optional*)
  - **Phone Number** (*Optional*)
  - **Tag** (*Optional*, e.g., Work, Family, Friends, VIP, etc.)
- ⚡ **Productivity & UX**:
  - Instant search filtering by name, phone, mail, or tag.
  - Quick tag chips for one-tap filtering.
  - Quick actions: One-tap direct call (`tel:`), email (`mailto:`), copy phone number to clipboard, edit, and delete.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure JSON Bin in `.env`
Open `.env` (or copy from `.env.example`) and fill in your JSONBin credentials:

```env
PORT=3000
JSONBIN_API_KEY=your_master_key_here
JSONBIN_BIN_ID=your_bin_id_here
```

#### How to get a free JSONBin in 30 seconds:
1. Go to [https://jsonbin.io](https://jsonbin.io) and sign up for a free account.
2. In the dashboard, click **Create Bin** and paste:
   ```json
   {
     "contacts": []
   }
   ```
3. Click **Create Bin** and copy the **Bin ID** from the page or URL.
4. Go to **API Keys** on the left menu, copy your **Master Key** (starts with `$2a$` or `$2b$`).
5. Paste both `JSONBIN_API_KEY` and `JSONBIN_BIN_ID` into `.env`.

### 3. Start the Server
```bash
npm start
```

You will see:
```text
🚀 ContactCache is live at:
   - Local:    http://localhost:3000
   - Network:  http://192.168.0.100:3000 (Open on phones/tablets to install)
📁 Mode: Cloud Sync (JSONbin.io)
```

---

## 📱 Installing as an App

### On Chrome / Edge (Desktop)
1. Open `http://localhost:3000` (or your network URL).
2. Click the install icon in your browser address bar (or browser menu $\rightarrow$ **Install ContactCache**).
3. ContactCache will be installed to your desktop / Start menu with its icon.

### On Android (Chrome)
1. On your phone connected to the same Wi-Fi, navigate to `http://<YOUR_PC_IP>:3000` (e.g. `http://192.168.0.100:3000`).
2. Tap the **"Install App"** button or the browser menu (⋮) -> **"Add to Home screen"** / **"Install app"**.
3. It appears as an icon on your home screen and launches full screen.

### On iPhone / iPad (Safari)
1. Navigate to your network URL in Safari.
2. Tap the **Share** button (box with an arrow pointing up).
3. Scroll down and tap **"Add to Home Screen"**.

---

## 🛠️ API Reference

- `GET /api/status`: Returns current sync status (JSONBin vs Local fallback).
- `GET /api/contacts`: Fetches contacts from JSONBin.
- `POST /api/contacts`: Adds a new contact (`name` required; `email`, `phone`, `tag` optional).
- `PUT /api/contacts/:id`: Updates an existing contact.
- `DELETE /api/contacts/:id`: Deletes a contact.
- `POST /api/config`: Dynamically updates and tests JSONBin credentials.
