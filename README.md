# OnlyD Hub — Unified All-in-One Monochrome Suite

An all-in-one minimal monochrome workspace unifying your 5 apps into a single seamless platform:
1. **Shelf** (Books, Movies, TV Shows, Anime, Manga & Collections)
2. **Budget** (Target Savings with animated milestones & Rupee Spendings tracker)
3. **Contacts** (ContactCache directory with tags & one-tap calling/emailing)
4. **Vault** (Credentials & Web bookmarks shelf — zero password/PIN friction)
5. **Wishlist** (Priority dreams & shopping targets with prices in ₹)

---

## 🖤 Design & Architecture
- **Pure Black & White Aesthetic**: High-contrast, clean typography, minimal cards, and crisp borders inspired by `my-shelf`.
- **Zero Password / PIN Protection**: Removed all locks (Vault PIN and Wishlist PIN) so you can directly access, edit, and view all items with zero friction.
- **Home Dashboard & Direct Navigation**: A single Home screen with key performance indicators and one-click navigation to every app. Responsive breadcrumbs and desktop/mobile menus allow instant switching.
- **Unified Multi-Device Backend**:
  - Express.js backend listening on `0.0.0.0:5000` (LAN accessible).
  - Synchronizes across phone, tablet, and PC automatically via local Wi-Fi.
  - Built-in QR Code generator under **"Multi-Device"** button in the header. Scan the QR code on your phone to open the suite instantly.
  - JSON atomic file store at [`server/data/db.json`](file:///c:/Users/DHARANIA/OneDrive/Desktop/Archive/OnlyD/server/data/db.json) with automatic backup and export/import restore support.

---

## 🚀 How to Run

### Step 1: Start the Backend & Frontend
In the root folder (`c:\Users\DHARANIA\OneDrive\Desktop\Archive\OnlyD`):

```bash
# Start the unified backend server (serves the built app & sync API on port 5000)
npm run server
```

The terminal will display your direct access URLs:
- **Local:** `http://localhost:5000`
- **Network (Phone / Tablet on Wi-Fi):** `http://<your-local-ip>:5000`

### Optional: Running in Vite Dev Mode with Hot Reload
If you want to edit code with instant hot-reloading:
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Vite Dev Server
npm run client
```
Open `http://localhost:3000`.

---

## 🔄 Multi-Device Sync

1. Connect your phone or other device to the same Wi-Fi network.
2. In the web app header, click **"Multi-Device"**.
3. Scan the QR code with your phone camera or copy the network URL (e.g. `http://192.168.0.100:5000`).
4. Any additions or changes made on any device sync in real-time.
