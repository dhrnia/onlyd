# Budget - Target Savings & Spendings in Indian Rupees (₹)

A minimal, high-contrast **Black & White (Monochrome)** web application featuring a modern sidebar layout with dynamic sub-modules for target savings and a dedicated spendings module.

---

## 🖤 Key Updates

1. **Renamed to "Budget":**
   - Clean, professional branding centered on financial goal tracking and expense control.
2. **Removed Analytics Tab:**
   - Streamlined interface focused strictly on two core workflows: **Savings Target** and **Spendings**.
3. **Sidebar Navigation with Dynamic Target Sub-Modules:**
   - **Savings Target (Main Module):** Contains an expandable sub-module list of all your targets (e.g. *Emergency Fund*, *New Workstation*).
   - **Automatic Sub-Module Creation:** Every time you add a new target, it is automatically rendered as a sub-module under **Savings Target** with its real-time percentage progress badge!
   - **Sub-Module Switching:** Click any sub-module in the sidebar to jump directly into that target's progress bar, deposit, withdrawal, and history.
   - **Inline "+ Add New Target" Button:** Conveniently located directly beneath the sub-modules.
   - **Spendings (Module 2):** One-click access to the complete expense logging, searching, and filtering workflow.
   - **Financial Snapshot Widget:** Real-time display of Total Saved, Total Spent, and Net Balance in the sidebar.

---

## 🌟 Core Capabilities

### 1. 🎯 Savings Target
- **Visual Progress Bar:** Dynamic animated monochrome progress bar with milestone indicators (25%, 50%, 75%, 100%) and remaining balance in Indian Rupees (`₹`).
- **Add Money (+):** Deposit funds towards your target with optional source notes (e.g. *Bonus, Monthly Salary*).
- **Remove Money (-):** Withdraw funds when needed with validation ensuring you never withdraw more than saved.
- **Quick Deposit Shortcuts:** `+₹100`, `+₹200`, `+₹300`, `+₹400`, `+₹500`, `+₹600`, `+₹700`, `+₹800`, `+₹900`, `+₹1,000`.
- **Target Achieved Celebration:** Monochrome silver and white confetti particles 🎉 when you reach 100%.
- **Chronological History:** Complete log of deposits and withdrawals with dates and delete options.

### 2. 💸 Spendings Tracker
- **Record Spendings in Seconds:** Log expenses with Amount in ₹, Category, Payment Method (UPI / GPay / PhonePe / Paytm, Cash, Cards, Net Banking), Date, and Notes.
- **Instant Search & Filters:** Search by note, category, or payment method, with sorting by date or amount.
- **Monthly & Daily Stats:** Track month-to-date and today's total spendings.

### 3. 💾 Data Persistence & Backup
- Automatically saved locally in browser `localStorage`.
- Full JSON export and restore capabilities.

---

## 🚀 How to Run the Website

### Option 1: Direct in Browser (No Server Needed)
Simply double-click [`index.html`](file:///c:/Users/DHARANIA/OneDrive/Desktop/budget/index.html) or open it with your browser (Chrome, Edge, Firefox, Brave).

### Option 2: Run with Python Local Server
```bash
python -m http.server 3000
```
Then visit: `http://localhost:3000`

---

## 📁 File Structure

- [`index.html`](file:///c:/Users/DHARANIA/OneDrive/Desktop/budget/index.html) — Modern Black & White layout with responsive sidebar and sub-modules.
- [`css/styles.css`](file:///c:/Users/DHARANIA/OneDrive/Desktop/budget/css/styles.css) — Custom monochrome styles, glass cards, and scrollbar styling.
- [`js/app.js`](file:///c:/Users/DHARANIA/OneDrive/Desktop/budget/js/app.js) — Application logic, sidebar sub-module rendering, Indian Rupee formatting, and modal management.
- `README.md` — Documentation.
