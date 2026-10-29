# PettyFlow — Office Petty Cash & Expense Management Web Application

> **A premium, modern, fully responsive client-side financial dashboard for recording office petty cash expenses, employee reimbursement claims, PickMe/Uber ride receipts, and vendor invoices.**

---

## 1. Quick Start (Zero Installation Required)

PettyFlow is built using **pure HTML5, CSS3, and Vanilla JavaScript**. It requires **no build step, no npm, no package installation, and no Node.js backend server**.

### How to Run:
1. Double-click `index.html` or right-click and choose **Open with > Google Chrome / Microsoft Edge / Mozilla Firefox / Safari**.
2. Alternatively, serve via any standard static web server or IDE Live Server.
3. The application will initialize immediately with pre-loaded, realistic demonstration records.

---

## 2. Key Features & Capabilities

### 1. Executive Dashboard
- **4 Live Financial Metric Cards**:
  - **Total Expenses Recorded**: All recorded office petty cash expenses.
  - **Pending Reimbursements**: Total personal expenses awaiting company payout.
  - **Total Reimbursed**: Settled claims paid back to employees.
  - **Company Cash Expenses**: Expenses paid directly from office cash (no reimbursement needed).
- **Interactive Chart.js Visualizations**:
  - **Expense Trend Line Chart**: Filterable by *Last 7 Days*, *This Month*, *Last 3 Months*, and *This Year*.
  - **Expense by Category Doughnut Chart**: Itemized percentages and exact amounts in Sri Lankan Rupees (LKR / Rs.).
- **Quick Action Bar**: 1-click access to *Add New Expense*, *Upload Receipt*, *View Pending Claims*, and *Export Report*.
- **Demonstration Mode Banner**: Realistic office expense examples with a 1-click toggle to clear or restore demo records.
- **Recent Transactions Table**: Live status badges and quick view/edit drawer actions.

### 2. Comprehensive Expense Entry & Live Voucher Preview
- **Split-Screen Design**: Left side contains the entry form; right side updates an **interactive Live Voucher Preview** in real time.
- **Full Metadata Fields**:
  - Expense Date (defaults to current date).
  - Expense Title & Detailed Business Purpose.
  - Category (Transport, Fuel, Meals & Refreshments, Office Supplies, Parking & Tolls, Accommodation, Communication, Equipment, Other).
  - **Transport Provider Selector**: When *Transport* is selected, switches on specialized options for **PickMe**, **Uber**, **Public Transit**, and **Taxi/Tuk**.
  - Gross Amount in LKR with formatted live preview.
  - Payment Method (Personal Cash, Personal Card, PickMe, Uber, Bank Transfer, Company Cash Float).
  - Vendor / Service Provider (e.g. PickMe Sri Lanka, Keells Super, Ceypetco, Sarasavi Bookshop).
  - Paid By (Employee name).
  - Reimbursement Status (Pending, Submitted, Approved, Reimbursed, Rejected, Not Applicable).
  - Optional Reference Notes / Bill Number.
- **Action Buttons**:
  - *Save Expense Record*.
  - *Save & Add Another* (streamlined for multiple receipts).
  - *Cancel*.

### 3. Drag-and-Drop Receipt & Screenshot Upload
- **Supported Formats**: JPG, JPEG, PNG, WebP, and PDF documents.
- **Multi-File Attachments**: Upload multiple bills or screenshot vouchers per expense.
- **Drag-and-Drop Zone**: Intuitive dropzone with file size validation (up to 5MB per file).
- **Interactive Preview Cards**: Visual thumbnails for images and dedicated PDF document badges.
- **Fullscreen Lightbox**: Click to view images in full resolution or download attached PDF receipts.

### 4. All Transactions Management
- **Search Engine**: Real-time filtering by expense ID, title, vendor, description, or amount.
- **Multi-Criteria Filter Toolbar**:
  - Filter by Date Range (*Date From* and *Date To*).
  - Filter by Category.
  - Filter by Payment Method.
  - Filter by Reimbursement Status.
  - Sort by Date (Newest/Oldest) and Amount (High/Low).
- **Pagination**: Configurable page sizes with navigation buttons.
- **Responsive Mobile Layout**: Automatically switches from a wide data table to clean mobile transaction cards on small screens.
- **CSV Data Exporter**: Export filtered or all transaction records directly into Microsoft Excel / Google Sheets compatible CSV format.

### 5. Employee Reimbursement Workflow Engine
- **Specialized Claim Pipeline**: Isolates personal out-of-pocket expenses from company float payments.
- **Visual Status Progression**: Stepper tracking lifecycle:
  `Recorded` &rarr; `Submitted` &rarr; `Approved` &rarr; `Reimbursed`.
- **Workflow Actions**:
  - *Submit Claim*: Forward draft expenses to management.
  - *Approve Claim*: Authorize by department head.
  - *Mark Reimbursed*: Open settlement modal to log payment date and cheque/transfer reference number.
- **Filter Tabs**: *All Claims*, *Pending Drafts*, *Submitted*, *Approved*, and *Reimbursed*.

### 6. Reports, Transport Analytics & Printable Statement
- **Ride-Hailing & Transport Breakdown**:
  - Direct comparative analysis: **PickMe vs. Uber vs. Other transit**.
  - Percentage visual progress bars and cost share.
- **Payment Source Distribution**: Personal out-of-pocket spending compared against direct office cash float.
- **Printable Formal Expense Statement (`@media print`)**:
  - Formatted for physical A4 printing or browser "Save as PDF".
  - Clean header with company details and statement dates.
  - Complete itemized transaction table with grand totals.
  - Physical sign-off blocks: *Claimant Employee*, *Department Head*, and *Finance Custodian*.

### 7. Settings & Data Management
- **Company & Employee Profile**: Update entity name, employee name, and designation.
- **Petty Cash Float & Budget**: Adjust opening allocation and monthly target thresholds.
- **JSON Backup & Migration**:
  - *Export Data Backup (JSON)*: Save a complete snapshot of all transactions and settings.
  - *Import Backup (JSON)*: Restore records on any computer.
- **Data Management**: Clear sample demo records or perform a complete factory reset.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Structure** | Semantic HTML5 with accessible labels, modal overlays, and ARIA roles |
| **Styling** | Vanilla CSS3 (Custom design system, flexbox, CSS grid, CSS variables, `@media print`) |
| **Logic** | Vanilla JavaScript (ES6+ modular controllers, event delegation) |
| **Typography** | Inter font via Google Fonts CDN |
| **Icons** | Lucide Icons via unpkg CDN |
| **Charts** | Chart.js via jsDelivr CDN |
| **Client Storage** | `localStorage` (metadata & settings) + `IndexedDB` (`PettyFlowDB` for attachments) |

---

## 4. Architecture & Security Limitations (Section 14)

PettyFlow is designed as a **client-side front-end web application**. Because it does not rely on a centralized backend server, please note the following operational considerations:

1. **Local Browser Isolation**:
   - All transactions, settings, and receipts are stored locally inside the user's browser.
   - Other employees or department managers cannot automatically see records entered on your computer unless exported.
2. **Persistence & Browser Cache**:
   - Clearing browser history, cookies, or website data will remove locally saved records.
   - Users are advised to regularly use **Settings > Export Data Backup (JSON)** to preserve company financial history.
3. **Authentication & Multi-Tenant Access**:
   - Any login simulation or employee profile in this prototype is strictly for interface and UI demonstration. It is not an enterprise access control system.
4. **Receipt Storage Limits**:
   - Image and PDF receipts are cached client-side in browser memory and IndexedDB.
   - For permanent archiving, always retain physical bills or original files.
5. **Production Roadmap for Enterprise Deployment**:
   - To deploy PettyFlow across a multi-user corporate organization, the following enterprise infrastructure is recommended:
     - **Backend API**: Node.js (Express/NestJS), Go, or Python (FastAPI).
     - **Relational Database**: PostgreSQL or MySQL with ACID transaction compliance.
     - **Authentication**: OAuth 2.0 / SSO with Role-Based Access Control (Claimant, Approver, Finance Custodian).
     - **Receipt Storage**: Secure, encrypted cloud object storage (e.g., AWS S3, Google Cloud Storage, or Azure Blob Storage).

---

## 5. File Structure

```
Office Expense Management Web Application/
├── index.html       # Main application markup and modal definitions
├── style.css        # Complete CSS design system, responsive styles & print layout
├── script.js       # Core vanilla JavaScript controllers, database & charts
└── README.md        # Technical documentation and architecture guide
```

---

## 6. Verification Checklist

- [x] Runs directly by opening `index.html` in any modern browser without npm or Node.js.
- [x] Separate `index.html`, `style.css`, and `script.js` files.
- [x] Lucide icons and Chart.js integrated via CDN.
- [x] Complete Dashboard with 5 KPI summary cards and dual charts.
- [x] Full expense entry form with live preview voucher card and PickMe/Uber provider logic.
- [x] Drag-and-drop receipt and screenshot upload with preview and lightbox.
- [x] All Transactions table with search, multi-filters, sorting, pagination, and CSV export.
- [x] Employee Reimbursement workflow with status advancement and claim cards.
- [x] Reports page with PickMe vs. Uber comparison and print-friendly A4 statement.
- [x] Settings with profile customization, JSON backup/restore, and reset controls.
- [x] Storage quota handled responsibly with IndexedDB fallback and limitation documentation.
