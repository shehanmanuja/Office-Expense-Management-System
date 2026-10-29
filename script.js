/**
 * PettyFlow - Office Petty Cash & Expense Management System
 * Core Application Logic (Vanilla JavaScript ES6+)
 * 
 * Modules:
 * 1. Storage & Database Controller (localStorage + IndexedDB for attachments)
 * 2. Sample Data Provider (Realistic Sri Lankan corporate expenses: PickMe, Fuel, Meals)
 * 3. App State & State Management
 * 4. UI Router & Navigation Controller
 * 5. Add / Edit Expense Form & Live Preview Controller
 * 6. Receipt & Drag-and-Drop Attachment Manager
 * 7. Dashboard & Chart.js Analytics Controller
 * 8. All Transactions Table, Search, Filter, Sort & CSV Exporter
 * 9. Reimbursement Workflow Engine
 * 10. Reports, Transport Comparison & Printable Statement Controller
 * 11. Settings & Backup/Restore Manager
 * 12. Modal & Toast Notification System
 */

'use strict';

// =============================================================================
// 1. Storage & Database Controller
// =============================================================================
const DB_NAME = 'PettyFlowDB';
const DB_VERSION = 1;
const STORE_ATTACHMENTS = 'receipt_attachments';

class AttachmentDB {
  constructor() {
    this.db = null;
    this.readyPromise = this.initDB();
  }

  initDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported; falling back to in-memory/base64 cache.');
        resolve(false);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_ATTACHMENTS)) {
          db.createObjectStore(STORE_ATTACHMENTS, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(true);
      };
      request.onerror = () => {
        console.warn('Could not open IndexedDB, falling back.');
        resolve(false);
      };
    });
  }

  async saveAttachment(id, fileData) {
    await this.readyPromise;
    if (!this.db) return false;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(STORE_ATTACHMENTS, 'readwrite');
        const store = tx.objectStore(STORE_ATTACHMENTS);
        store.put({ id, data: fileData });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (err) {
        console.warn('Error saving to IndexedDB:', err);
        resolve(false);
      }
    });
  }

  async getAttachment(id) {
    await this.readyPromise;
    if (!this.db) return null;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(STORE_ATTACHMENTS, 'readonly');
        const store = tx.objectStore(STORE_ATTACHMENTS);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  }

  async deleteAttachment(id) {
    await this.readyPromise;
    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_ATTACHMENTS, 'readwrite');
      tx.objectStore(STORE_ATTACHMENTS).delete(id);
    } catch (e) {}
  }

  async clearAll() {
    await this.readyPromise;
    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_ATTACHMENTS, 'readwrite');
      tx.objectStore(STORE_ATTACHMENTS).clear();
    } catch (e) {}
  }
}

const attachmentStore = new AttachmentDB();

// =============================================================================
// 2. Sample Data Provider (Realistic Sri Lankan Corporate Expenses)
// =============================================================================
const SAMPLE_SETTINGS = {
  companyName: 'Eximius Power And Energy (Pvt) Ltd',
  employeeName: 'Your Name',
  employeeRole: 'Your Designation',
  currency: 'LKR',
  currencySymbol: 'Rs.'
};

// Generates an inline SVG receipt data URL for realistic interactive visual preview
function createMockReceiptSVG(title, vendor, date, amountStr, category, id) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520">
    <rect width="400" height="520" fill="#ffffff" rx="8" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="0" y="0" width="400" height="70" fill="#0f172a"/>
    <text x="200" y="32" fill="#ffffff" font-family="Inter, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">OFFICIAL EXPENSE RECEIPT</text>
    <text x="200" y="54" fill="#94a3b8" font-family="Inter, sans-serif" font-size="12" text-anchor="middle">${vendor.toUpperCase()} • VOUCHER</text>
    <circle cx="200" cy="95" r="16" fill="#eff6ff"/>
    <text x="200" y="100" fill="#2563eb" font-family="Inter, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">✓</text>
    <text x="200" y="130" fill="#0f172a" font-family="Inter, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">${title}</text>
    <text x="200" y="150" fill="#64748b" font-family="Inter, sans-serif" font-size="12" text-anchor="middle">Transaction ID: ${id} | ${date}</text>
    <line x1="30" y1="170" x2="370" y2="170" stroke="#e2e8f0" stroke-dasharray="4"/>
    <text x="40" y="200" fill="#64748b" font-family="Inter, sans-serif" font-size="13">Category:</text>
    <text x="360" y="200" fill="#0f172a" font-family="Inter, sans-serif" font-size="13" font-weight="600" text-anchor="end">${category}</text>
    <text x="40" y="230" fill="#64748b" font-family="Inter, sans-serif" font-size="13">Vendor / Merchant:</text>
    <text x="360" y="230" fill="#0f172a" font-family="Inter, sans-serif" font-size="13" font-weight="600" text-anchor="end">${vendor}</text>
    <text x="40" y="260" fill="#64748b" font-family="Inter, sans-serif" font-size="13">Payment Status:</text>
    <text x="360" y="260" fill="#059669" font-family="Inter, sans-serif" font-size="13" font-weight="bold" text-anchor="end">PAID &amp; CONFIRMED</text>
    <line x1="30" y1="285" x2="370" y2="285" stroke="#e2e8f0"/>
    <rect x="30" y="300" width="340" height="75" fill="#f8fafc" rx="6"/>
    <text x="50" y="330" fill="#64748b" font-family="Inter, sans-serif" font-size="13">Total Paid (LKR):</text>
    <text x="350" y="348" fill="#1e40af" font-family="Inter, sans-serif" font-size="24" font-weight="800" text-anchor="end">${amountStr}</text>
    <line x1="30" y1="400" x2="370" y2="400" stroke="#e2e8f0" stroke-dasharray="3"/>
    <text x="200" y="425" fill="#94a3b8" font-family="monospace" font-size="11" text-anchor="middle">|||| | ||||| |||| || |||||| | |||| ||||</text>
    <text x="200" y="445" fill="#64748b" font-family="Inter, sans-serif" font-size="11" text-anchor="middle">Electronic Verification Hash #9843-001</text>
    <text x="200" y="480" fill="#94a3b8" font-family="Inter, sans-serif" font-size="10" text-anchor="middle">Eximius Power And Energy Office Petty Cash System • PettyFlow</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function getInitialSampleTransactions() {
  return [
    {
      id: 'EXP-2026-001',
      date: '2026-10-24',
      time: '09:30',
      title: 'PickMe ride to Client Office (Colombo 07 to Fort)',
      description: 'Attended urgent client meeting regarding firewall deployment in Fort branch.',
      category: 'Transport',
      transportProvider: 'PickMe',
      amount: 1450.00,
      paymentMethod: 'PickMe',
      paidBy: 'Your Name',
      vendor: 'PickMe Sri Lanka',
      reimbursementStatus: 'Reimbursed',
      isPersonalExpense: true,
      notes: 'Trip fare breakdown screenshot attached. Settled via cash voucher #401.',
      reimbursementHistory: [
        { date: '2026-10-24', status: 'Pending', note: 'Created expense' },
        { date: '2026-10-25', status: 'Submitted', note: 'Claim filed by employee' },
        { date: '2026-10-26', status: 'Approved', note: 'Approved by Operations Head' },
        { date: '2026-10-27', status: 'Reimbursed', note: 'Paid via direct bank transfer Ref #TXN9923' }
      ],
      attachments: [
        {
          id: 'att-001',
          name: 'pickme_trip_receipt_fort.svg',
          size: 14200,
          type: 'image/svg+xml',
          isPdf: false,
          dataUrl: createMockReceiptSVG('PickMe Trip (Col 07 -> Fort)', 'PickMe Sri Lanka', '2026-10-24', 'Rs. 1,450.00', 'Transport', 'EXP-2026-001')
        }
      ],
      isSample: true,
      createdAt: '2026-10-24T09:30:00Z',
      updatedAt: '2026-10-27T14:10:00Z'
    },
    {
      id: 'EXP-2026-002',
      date: '2026-10-25',
      time: '11:15',
      title: 'Ceypetco Fuel for Site Visit to Kaduwela Substation',
      description: 'Purchased 15L of diesel fuel for company emergency standby generator vehicle.',
      category: 'Fuel',
      transportProvider: 'Other',
      amount: 5000.00,
      paymentMethod: 'Personal Cash',
      paidBy: 'Your Name',
      vendor: 'Ceypetco Filling Station',
      reimbursementStatus: 'Approved',
      isPersonalExpense: true,
      notes: 'Fuel dispenser slip verified by vehicle logbook.',
      reimbursementHistory: [
        { date: '2026-10-25', status: 'Pending', note: 'Expense entered' },
        { date: '2026-10-26', status: 'Submitted', note: 'Filed claim' },
        { date: '2026-10-28', status: 'Approved', note: 'Approved for reimbursement payment batch #12' }
      ],
      attachments: [
        {
          id: 'att-002',
          name: 'ceypetco_diesel_slip.svg',
          size: 15300,
          type: 'image/svg+xml',
          isPdf: false,
          dataUrl: createMockReceiptSVG('Ceypetco Fuel Bill (15L Diesel)', 'Ceypetco Filling Station', '2026-10-25', 'Rs. 5,000.00', 'Fuel', 'EXP-2026-002')
        }
      ],
      isSample: true,
      createdAt: '2026-10-25T11:15:00Z',
      updatedAt: '2026-10-28T10:00:00Z'
    },
    {
      id: 'EXP-2026-003',
      date: '2026-10-26',
      time: '14:20',
      title: 'Client Meeting Refreshments (Pastries & Coffee)',
      description: 'Purchased tea, savoury pastries and bottled water for visiting banking client delegates.',
      category: 'Meals & Refreshments',
      transportProvider: 'Other',
      amount: 3820.00,
      paymentMethod: 'Personal Debit/Credit Card',
      paidBy: 'Your Name',
      vendor: 'Keells Super',
      reimbursementStatus: 'Submitted',
      isPersonalExpense: true,
      notes: 'Paid using personal credit card.',
      reimbursementHistory: [
        { date: '2026-10-26', status: 'Pending', note: 'Created expense' },
        { date: '2026-10-27', status: 'Submitted', note: 'Submitted for managerial review' }
      ],
      attachments: [
        {
          id: 'att-003',
          name: 'keells_tax_invoice.svg',
          size: 13900,
          type: 'image/svg+xml',
          isPdf: false,
          dataUrl: createMockReceiptSVG('Keells Super Refreshments Bill', 'Keells Supermarkets', '2026-10-26', 'Rs. 3,820.00', 'Meals & Refreshments', 'EXP-2026-003')
        }
      ],
      isSample: true,
      createdAt: '2026-10-26T14:20:00Z',
      updatedAt: '2026-10-27T08:30:00Z'
    },
    {
      id: 'EXP-2026-004',
      date: '2026-10-26',
      time: '16:00',
      title: 'A4 Paper Reams & Sticky Notes for Board Room',
      description: 'Direct petty cash purchase of stationery for quarterly review presentation.',
      category: 'Office Supplies',
      transportProvider: 'Other',
      amount: 6500.00,
      paymentMethod: 'Company Cash',
      paidBy: 'Your Name',
      vendor: 'Sarasavi Bookshop',
      reimbursementStatus: 'Not Applicable',
      isPersonalExpense: false,
      notes: 'Paid directly from the office petty cash drawer.',
      reimbursementHistory: [
        { date: '2026-10-26', status: 'Not Applicable', note: 'Paid with Company Cash float' }
      ],
      attachments: [
        {
          id: 'att-004',
          name: 'sarasavi_cash_memo.svg',
          size: 14500,
          type: 'image/svg+xml',
          isPdf: false,
          dataUrl: createMockReceiptSVG('Sarasavi Stationery Cash Memo', 'Sarasavi Bookshop', '2026-10-26', 'Rs. 6,500.00', 'Office Supplies', 'EXP-2026-004')
        }
      ],
      isSample: true,
      createdAt: '2026-10-26T16:00:00Z',
      updatedAt: '2026-10-26T16:00:00Z'
    },
    {
      id: 'EXP-2026-005',
      date: '2026-10-27',
      time: '10:45',
      title: 'Uber Trip to Department of Commerce for Filing',
      description: 'Travelled to government department to hand-deliver corporate annual declaration papers.',
      category: 'Transport',
      transportProvider: 'Uber',
      amount: 1890.00,
      paymentMethod: 'Uber',
      paidBy: 'Your Name',
      vendor: 'Uber Sri Lanka',
      reimbursementStatus: 'Pending',
      isPersonalExpense: true,
      notes: 'Ride screenshot attached. Awaiting submission.',
      reimbursementHistory: [
        { date: '2026-10-27', status: 'Pending', note: 'Expense created' }
      ],
      attachments: [
        {
          id: 'att-005',
          name: 'uber_ride_receipt.svg',
          size: 14100,
          type: 'image/svg+xml',
          isPdf: false,
          dataUrl: createMockReceiptSVG('Uber Business Trip (HQ -> Dept)', 'Uber Sri Lanka', '2026-10-27', 'Rs. 1,890.00', 'Transport', 'EXP-2026-005')
        }
      ],
      isSample: true,
      createdAt: '2026-10-27T10:45:00Z',
      updatedAt: '2026-10-27T10:45:00Z'
    },
    {
      id: 'EXP-2026-006',
      date: '2026-10-27',
      time: '15:10',
      title: 'Emergency Cat6 Patch Cables & HDMI Adapter',
      description: 'Replaced degraded server room patch cables and conference room projection adapter.',
      category: 'Equipment',
      transportProvider: 'Other',
      amount: 4200.00,
      paymentMethod: 'Personal Debit/Credit Card',
      paidBy: 'Your Name',
      vendor: 'Barclays Computers',
      reimbursementStatus: 'Reimbursed',
      isPersonalExpense: true,
      notes: 'Invoice attached. Settled in payroll adjustment.',
      reimbursementHistory: [
        { date: '2026-10-27', status: 'Pending', note: 'Entered expense' },
        { date: '2026-10-27', status: 'Submitted', note: 'Submitted claim' },
        { date: '2026-10-28', status: 'Approved', note: 'Approved by IT Director' },
        { date: '2026-10-29', status: 'Reimbursed', note: 'Reimbursed via petty cash voucher #408' }
      ],
      attachments: [
        {
          id: 'att-006',
          name: 'barclays_hardware_tax_invoice.svg',
          size: 15100,
          type: 'image/svg+xml',
          isPdf: false,
          dataUrl: createMockReceiptSVG('Barclays Hardware IT Invoice', 'Barclays Computers', '2026-10-27', 'Rs. 4,200.00', 'Equipment', 'EXP-2026-006')
        }
      ],
      isSample: true,
      createdAt: '2026-10-27T15:10:00Z',
      updatedAt: '2026-10-29T09:00:00Z'
    },
    {
      id: 'EXP-2026-007',
      date: '2026-10-28',
      time: '09:00',
      title: 'Office Drinking Water 19L Dispensers Refill',
      description: 'Purchased 5 bottles of purified drinking water refills for the engineering floor.',
      category: 'Office Supplies',
      transportProvider: 'Other',
      amount: 2100.00,
      paymentMethod: 'Company Cash',
      paidBy: 'Your Name',
      vendor: 'American Water Lanka',
      reimbursementStatus: 'Not Applicable',
      isPersonalExpense: false,
      notes: 'Regular monthly office water delivery bill.',
      reimbursementHistory: [
        { date: '2026-10-28', status: 'Not Applicable', note: 'Paid with office cash' }
      ],
      attachments: [
        {
          id: 'att-007',
          name: 'water_delivery_bill.svg',
          size: 13800,
          type: 'image/svg+xml',
          isPdf: false,
          dataUrl: createMockReceiptSVG('American Water Delivery Bill', 'American Water Lanka', '2026-10-28', 'Rs. 2,100.00', 'Office Supplies', 'EXP-2026-007')
        }
      ],
      isSample: true,
      createdAt: '2026-10-28T09:00:00Z',
      updatedAt: '2026-10-28T09:00:00Z'
    },
    {
      id: 'EXP-2026-008',
      date: '2026-10-28',
      time: '13:30',
      title: 'Express Courier Dispatch for Legal NDAs',
      description: 'Sent urgent non-disclosure agreements to external legal counsel in Rajagiriya.',
      category: 'Communication',
      transportProvider: 'Other',
      amount: 850.00,
      paymentMethod: 'Personal Cash',
      paidBy: 'Your Name',
      vendor: 'Pronto Lanka Express',
      reimbursementStatus: 'Approved',
      isPersonalExpense: true,
      notes: 'Waybill consignment slip attached.',
      reimbursementHistory: [
        { date: '2026-10-28', status: 'Pending', note: 'Created' },
        { date: '2026-10-28', status: 'Submitted', note: 'Filed claim' },
        { date: '2026-10-29', status: 'Approved', note: 'Approved by Legal team' }
      ],
      attachments: [
        {
          id: 'att-008',
          name: 'pronto_courier_waybill.svg',
          size: 13400,
          type: 'image/svg+xml',
          isPdf: false,
          dataUrl: createMockReceiptSVG('Pronto Courier Waybill #4920', 'Pronto Lanka Express', '2026-10-28', 'Rs. 850.00', 'Communication', 'EXP-2026-008')
        }
      ],
      isSample: true,
      createdAt: '2026-10-28T13:30:00Z',
      updatedAt: '2026-10-29T10:15:00Z'
    },
    {
      id: 'EXP-2026-009',
      date: '2026-10-29',
      time: '08:45',
      title: 'Multi-Storey Car Park Fee (World Trade Center)',
      description: 'Official client contract signing parking for 3 hours at WTC Colombo.',
      category: 'Parking & Tolls',
      transportProvider: 'Other',
      amount: 600.00,
      paymentMethod: 'Personal Cash',
      paidBy: 'Your Name',
      vendor: 'WTC Colombo Parking',
      reimbursementStatus: 'Pending',
      isPersonalExpense: true,
      notes: 'Automated barrier exit ticket.',
      reimbursementHistory: [
        { date: '2026-10-29', status: 'Pending', note: 'Expense created' }
      ],
      attachments: [
        {
          id: 'att-009',
          name: 'wtc_parking_ticket.svg',
          size: 13200,
          type: 'image/svg+xml',
          isPdf: false,
          dataUrl: createMockReceiptSVG('WTC Automated Parking Receipt', 'WTC Colombo Parking', '2026-10-29', 'Rs. 600.00', 'Parking & Tolls', 'EXP-2026-009')
        }
      ],
      isSample: true,
      createdAt: '2026-10-29T08:45:00Z',
      updatedAt: '2026-10-29T08:45:00Z'
    }
  ];
}

// =============================================================================
// 3. Application State & Storage Management
// =============================================================================
class AppState {
  constructor() {
    this.settings = this.loadSettings();
    this.transactions = this.loadTransactions().filter(t => !t.isSample);
    this.persistTransactions(this.transactions);
    this.currentView = 'dashboard';
    this.stagedAttachments = []; // Files currently staged in Add/Edit Form
    this.editingExpenseId = null;
    this.charts = {
      trend: null,
      category: null,
      paymentSource: null
    };
    this.selectedTrendPeriod = '1m';
    this.reimburseActiveTab = 'ALL';
    this.txCurrentPage = 1;
    this.txPageSize = 8;
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('pettyflow_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        let updated = false;
        if (!parsed.companyName || parsed.companyName === 'Apex Innovations (Pvt) Ltd') {
          parsed.companyName = SAMPLE_SETTINGS.companyName;
          updated = true;
        }
        if (parsed.employeeName === 'Shehan Perera') {
          parsed.employeeName = SAMPLE_SETTINGS.employeeName;
          updated = true;
        }
        if (parsed.employeeRole === 'Senior Systems Engineer') {
          parsed.employeeRole = SAMPLE_SETTINGS.employeeRole;
          updated = true;
        }
        if (updated) {
          try {
            localStorage.setItem('pettyflow_settings', JSON.stringify(parsed));
          } catch (e) {}
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read settings from localStorage:', e);
    }
    return { ...SAMPLE_SETTINGS };
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem('pettyflow_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Could not save settings:', e);
    }
  }

  loadTransactions() {
    try {
      const saved = localStorage.getItem('pettyflow_transactions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Keep only user's genuine records, clean out any preloaded demo samples
          const userOnly = parsed.filter(t => !t.isSample);
          this.persistTransactions(userOnly);
          return userOnly;
        }
      }
    } catch (e) {
      console.warn('Could not read transactions:', e);
    }
    // Clean fresh start - empty transactions
    this.persistTransactions([]);
    return [];
  }

  persistTransactions(txList) {
    this.transactions = txList || this.transactions;
    try {
      localStorage.setItem('pettyflow_transactions', JSON.stringify(this.transactions));
    } catch (e) {
      console.error('Storage quota exceeded or error persisting transactions:', e);
      showToast('Storage Notice', 'Browser storage is nearly full. Please avoid excessively large files.', 'warning');
    }
  }

  generateNextExpenseId() {
    const year = new Date().getFullYear();
    const existingNums = this.transactions
      .map(t => {
        const match = t.id && t.id.match(/EXP-\d{4}-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const nextNum = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    return `EXP-${year}-${String(nextNum).padStart(3, '0')}`;
  }

  // Financial Metric Calculations
  getCalculations() {
    let totalExpenses = 0;
    let totalReimbursed = 0;
    let pendingReimbursements = 0;
    let companyCashExpenses = 0;
    let personalExpenses = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let submittedCount = 0;
    let reimbursedCount = 0;

    this.transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      totalExpenses += amt;

      const isPersonal = tx.paymentMethod !== 'Company Cash';
      if (isPersonal) {
        personalExpenses += amt;
        if (tx.reimbursementStatus === 'Reimbursed') {
          totalReimbursed += amt;
          reimbursedCount++;
        } else if (tx.reimbursementStatus === 'Pending') {
          pendingReimbursements += amt;
          pendingCount++;
        } else if (tx.reimbursementStatus === 'Submitted') {
          pendingReimbursements += amt;
          submittedCount++;
        } else if (tx.reimbursementStatus === 'Approved') {
          pendingReimbursements += amt;
          approvedCount++;
        }
      } else {
        companyCashExpenses += amt;
      }
    });

    return {
      totalExpenses,
      totalReimbursed,
      pendingReimbursements,
      companyCashExpenses,
      personalExpenses,
      totalCount: this.transactions.length,
      pendingCount,
      submittedCount,
      approvedCount,
      reimbursedCount
    };
  }
}

const state = new AppState();

// Currency Formatter Helper
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return 'Rs. ' + num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return dateStr;
}

// =============================================================================
// 4. UI Router & Navigation Controller
// =============================================================================
function navigateTo(viewName) {
  state.currentView = viewName;

  // Update Nav Items active class
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Switch View Sections
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.remove('active');
  });

  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Update Page Title and Breadcrumb
  const titleMap = {
    'dashboard': { title: 'Dashboard Overview', breadcrumb: 'Dashboard' },
    'add-expense': { title: state.editingExpenseId ? 'Edit Expense Record' : 'Record New Expense', breadcrumb: 'Add Expense' },
    'transactions': { title: 'All Transaction Records', breadcrumb: 'Transactions' },
    'reimbursements': { title: 'Employee Reimbursement Claims', breadcrumb: 'Reimbursements' },
    'reports': { title: 'Reports & Analytics', breadcrumb: 'Reports' },
    'settings': { title: 'System & Profile Settings', breadcrumb: 'Settings' }
  };

  const info = titleMap[viewName] || { title: 'PettyFlow', breadcrumb: viewName };
  document.getElementById('pageTitleHeading').textContent = info.title;
  document.getElementById('breadcrumbCurrent').textContent = info.breadcrumb;

  // Close mobile sidebar if open
  document.getElementById('appSidebar').classList.remove('mobile-open');

  // Trigger view-specific render updates
  if (viewName === 'dashboard') {
    renderDashboard();
  } else if (viewName === 'transactions') {
    renderTransactionsTable();
  } else if (viewName === 'reimbursements') {
    renderReimbursementsView();
  } else if (viewName === 'reports') {
    renderReportsView();
  } else if (viewName === 'settings') {
    renderSettingsView();
  } else if (viewName === 'add-expense') {
    if (!state.editingExpenseId) {
      resetExpenseForm();
    }
  }

  // Refresh Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize Navigation Event Listeners
function initNavigation() {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view === 'add-expense') {
        state.editingExpenseId = null; // Clear edit mode if clicked from menu
      }
      navigateTo(view);
    });
  });

  // Sidebar Footer profile shortcut
  document.getElementById('sidebarUserProfile').addEventListener('click', () => {
    navigateTo('settings');
  });

  // Top bar buttons
  document.getElementById('topAddExpenseBtn').addEventListener('click', () => {
    state.editingExpenseId = null;
    navigateTo('add-expense');
  });

  document.getElementById('sidebarToggleBtn').addEventListener('click', () => {
    document.getElementById('appSidebar').classList.toggle('mobile-open');
  });

  // Quick Action cards on dashboard
  document.getElementById('qaAddExpense').addEventListener('click', () => {
    state.editingExpenseId = null;
    navigateTo('add-expense');
  });

  document.getElementById('qaUploadReceipt').addEventListener('click', () => {
    state.editingExpenseId = null;
    navigateTo('add-expense');
    setTimeout(() => {
      document.getElementById('receiptFileInput').click();
    }, 200);
  });

  document.getElementById('qaViewPending').addEventListener('click', () => {
    state.reimburseActiveTab = 'Pending';
    navigateTo('reimbursements');
  });

  document.getElementById('qaExportReport').addEventListener('click', () => {
    navigateTo('reports');
  });

  document.getElementById('dashViewAllTxBtn').addEventListener('click', () => {
    navigateTo('transactions');
  });

  // System info dialog
  document.getElementById('sysInfoBtn').addEventListener('click', () => {
    openModal('sysInfoModal');
  });
  document.getElementById('sysInfoModalCloseBtn').addEventListener('click', () => {
    closeModal('sysInfoModal');
  });
  document.getElementById('closeSysInfoModalBtn').addEventListener('click', () => {
    closeModal('sysInfoModal');
  });

  // Notification button
  document.getElementById('notificationBtn').addEventListener('click', () => {
    const calcs = state.getCalculations();
    showToast(
      'PettyFlow Status Summary',
      `You have ${calcs.pendingCount + calcs.submittedCount} claims awaiting reimbursement totaling ${formatCurrency(calcs.pendingReimbursements)}.`,
      'info'
    );
  });
}

// =============================================================================
// 5. Dashboard View & Charts Controller
// =============================================================================
function renderDashboard() {
  const calcs = state.getCalculations();

  // Top Nav Pending Reimbursements Display
  document.getElementById('navBalanceDisplay').textContent = formatCurrency(calcs.pendingReimbursements);

  // KPI Summary Cards
  document.getElementById('kpiTotalExpenses').textContent = formatCurrency(calcs.totalExpenses);
  document.getElementById('kpiTxCountBadge').textContent = `${calcs.totalCount} records`;
  document.getElementById('kpiPendingReimbursement').textContent = formatCurrency(calcs.pendingReimbursements);
  document.getElementById('kpiPendingCountBadge').textContent = `${calcs.pendingCount + calcs.submittedCount + calcs.approvedCount} claims`;
  document.getElementById('kpiTotalReimbursed').textContent = formatCurrency(calcs.totalReimbursed);
  document.getElementById('kpiCompanyExpenses').textContent = formatCurrency(calcs.companyCashExpenses);

  // Sidebar count badges
  document.getElementById('sidebar-tx-count').textContent = calcs.totalCount;
  const pendingClaimsTotal = calcs.pendingCount + calcs.submittedCount;
  const reimbBadge = document.getElementById('sidebar-pending-badge');
  reimbBadge.textContent = pendingClaimsTotal;
  reimbBadge.style.display = pendingClaimsTotal > 0 ? 'inline-block' : 'none';

  // Sample data banner visibility
  const hasSampleRecords = state.transactions.some(t => t.isSample);
  const sampleBanner = document.getElementById('sampleDataBanner');
  if (sampleBanner) {
    sampleBanner.style.display = hasSampleRecords ? 'flex' : 'none';
  }

  // Render Charts
  renderTrendChart();
  renderCategoryDonutChart();

  // Render Recent Transactions (Top 5)
  renderDashboardRecentTable();
}

function renderDashboardRecentTable() {
  const tbody = document.getElementById('dashboardRecentTbody');
  const mobileContainer = document.getElementById('dashboardRecentMobileList');
  tbody.innerHTML = '';
  mobileContainer.innerHTML = '';

  const recent = [...state.transactions]
    .sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00')))
    .slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem; color: #94a3b8;">No expenses recorded yet. Click "+ Add Expense" to create one.</td></tr>`;
    return;
  }

  recent.forEach(tx => {
    const tr = document.createElement('tr');
    const badgeClass = getBadgeClass(tx.reimbursementStatus);
    const receiptBadge = tx.attachments && tx.attachments.length > 0
      ? `<span class="receipt-indicator" data-id="${tx.id}"><i data-lucide="paperclip" style="width:13px;height:13px;"></i> ${tx.attachments.length}</span>`
      : `<span class="receipt-indicator none"><i data-lucide="minus" style="width:13px;height:13px;"></i></span>`;

    tr.innerHTML = `
      <td><span class="expense-id-cell">${escapeHtml(tx.id)}</span></td>
      <td>${formatDate(tx.date)}</td>
      <td style="max-width: 220px; font-weight: 500;">
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(tx.title)}">
          ${escapeHtml(tx.title)}
        </div>
      </td>
      <td><span class="category-tag">${escapeHtml(tx.category)}</span></td>
      <td class="tabular-nums" style="font-weight: 700; color: #0f172a;">${formatCurrency(tx.amount)}</td>
      <td><span class="payment-tag">${escapeHtml(tx.paymentMethod)}</span></td>
      <td>
        <span class="status-badge ${badgeClass}">
          <span class="badge-circle"></span>
          <span>${escapeHtml(tx.reimbursementStatus)}</span>
        </span>
      </td>
      <td>${receiptBadge}</td>
      <td style="text-align: right;">
        <div class="table-actions" style="justify-content: flex-end;">
          <button class="btn-icon-action view-tx-btn" data-id="${tx.id}" title="View Details">
            <i data-lucide="eye" style="width: 15px; height: 15px;"></i>
          </button>
          <button class="btn-icon-action edit-tx-btn" data-id="${tx.id}" title="Edit Expense">
            <i data-lucide="pencil" style="width: 15px; height: 15px;"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);

    // Mobile card item
    const mCard = document.createElement('div');
    mCard.className = 'mobile-transaction-card';
    mCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <span class="expense-id-cell">${escapeHtml(tx.id)}</span>
        <span class="status-badge ${badgeClass}"><span class="badge-circle"></span>${escapeHtml(tx.reimbursementStatus)}</span>
      </div>
      <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.25rem;">${escapeHtml(tx.title)}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:#64748b; margin-bottom:0.5rem;">
        <span>${formatDate(tx.date)} • ${escapeHtml(tx.category)}</span>
        <strong style="font-size:1rem; color:#0f172a;">${formatCurrency(tx.amount)}</strong>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
        <button class="btn-secondary view-tx-btn" data-id="${tx.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem;">View</button>
        <button class="btn-secondary edit-tx-btn" data-id="${tx.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem;">Edit</button>
      </div>
    `;
    mobileContainer.appendChild(mCard);
  });

  // Attach click handlers
  attachRowActionListeners(tbody);
  attachRowActionListeners(mobileContainer);
  if (window.lucide) window.lucide.createIcons();
}

function getBadgeClass(status) {
  switch (status) {
    case 'Pending': return 'pending';
    case 'Submitted': return 'submitted';
    case 'Approved': return 'approved';
    case 'Reimbursed': return 'reimbursed';
    case 'Rejected': return 'rejected';
    case 'Not Applicable': return 'na';
    default: return 'pending';
  }
}

// Chart.js - Expense Trend Chart
function renderTrendChart() {
  const canvas = document.getElementById('expenseTrendChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const period = state.selectedTrendPeriod; // '7d', '1m', '3m', '1y'

  // Prepare aggregated dates and totals
  const trendData = calculateTrendData(period);

  if (state.charts.trend) {
    state.charts.trend.destroy();
  }

  // Create subtle gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, 'rgba(30, 58, 138, 0.22)');
  gradient.addColorStop(1, 'rgba(30, 58, 138, 0.01)');

  state.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendData.labels,
      datasets: [{
        label: 'Expense Amount (LKR)',
        data: trendData.amounts,
        borderColor: '#1e3a8a',
        borderWidth: 2.5,
        backgroundColor: gradient,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#172554',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: 'Inter', size: 12, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: (ctx) => ` Spent: ${formatCurrency(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { family: 'Inter', size: 11 },
            color: '#64748b',
            callback: (val) => 'Rs. ' + (val >= 1000 ? (val / 1000) + 'k' : val)
          }
        }
      }
    }
  });
}

function calculateTrendData(period) {
  const now = new Date(2026, 9, 29); // Reference anchor date (October 29, 2026)
  const labels = [];
  const amounts = [];
  const dateMap = {};

  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const lbl = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      labels.push(lbl);
      dateMap[key] = 0;
    }
    state.transactions.forEach(t => {
      if (dateMap[t.date] !== undefined) {
        dateMap[t.date] += Number(t.amount) || 0;
      }
    });
    Object.keys(dateMap).forEach(k => amounts.push(dateMap[k]));
  } else if (period === '1m') {
    // Current month Oct 2026 into 4 weeks or 5-day intervals
    const days = [1, 5, 10, 15, 20, 25, 29];
    days.forEach((day, idx) => {
      const label = `Oct ${day}`;
      labels.push(label);
      const prevDay = idx === 0 ? 1 : days[idx - 1] + 1;
      let sum = 0;
      state.transactions.forEach(t => {
        if (t.date.startsWith('2026-10')) {
          const dNum = parseInt(t.date.split('-')[2], 10);
          if (dNum >= prevDay && dNum <= day) sum += Number(t.amount) || 0;
        }
      });
      amounts.push(sum);
    });
  } else if (period === '3m') {
    // Aug, Sep, Oct 2026
    const months = [
      { key: '2026-08', label: 'August' },
      { key: '2026-09', label: 'September' },
      { key: '2026-10', label: 'October' }
    ];
    months.forEach(m => {
      labels.push(m.label);
      let sum = 0;
      state.transactions.forEach(t => {
        if (t.date.startsWith(m.key)) sum += Number(t.amount) || 0;
      });
      amounts.push(sum);
    });
  } else {
    // '1y' - 2026 by quarter
    labels.push('Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)');
    const qSums = [0, 0, 0, 0];
    state.transactions.forEach(t => {
      if (t.date.startsWith('2026')) {
        const month = parseInt(t.date.split('-')[1], 10);
        const qIndex = Math.floor((month - 1) / 3);
        if (qIndex >= 0 && qIndex < 4) qSums[qIndex] += Number(t.amount) || 0;
      }
    });
    amounts.push(...qSums);
  }

  return { labels, amounts };
}

// Chart.js - Category Donut Chart
function renderCategoryDonutChart() {
  const canvas = document.getElementById('categoryDonutChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const catSums = {};

  state.transactions.forEach(t => {
    const cat = t.category || 'Other';
    catSums[cat] = (catSums[cat] || 0) + (Number(t.amount) || 0);
  });

  const categories = Object.keys(catSums);
  const dataValues = categories.map(c => catSums[c]);

  const palette = [
    '#3b82f6', // Transport
    '#f59e0b', // Fuel
    '#10b981', // Meals
    '#6366f1', // Office Supplies
    '#8b5cf6', // Parking
    '#06b6d4', // Accommodation
    '#ec4899', // Communication
    '#14b8a6', // Equipment
    '#94a3b8'  // Other
  ];

  if (state.charts.category) {
    state.charts.category.destroy();
  }

  if (categories.length === 0) {
    document.getElementById('categoryLegendList').innerHTML = '<div style="text-align:center;color:#94a3b8;font-size:0.8rem;">No expense categories recorded</div>';
    return;
  }

  state.charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories,
      datasets: [{
        data: dataValues,
        backgroundColor: palette.slice(0, categories.length),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: 'Inter', size: 12 },
          bodyFont: { family: 'Inter', size: 12 },
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`
          }
        }
      },
      cutout: '72%'
    }
  });

  // Populate HTML Legend with exact amounts
  const legendContainer = document.getElementById('categoryLegendList');
  legendContainer.innerHTML = '';
  const total = dataValues.reduce((a, b) => a + b, 0);

  categories.forEach((cat, i) => {
    const val = catSums[cat];
    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
    const item = document.createElement('div');
    item.className = 'donut-legend-item';
    item.innerHTML = `
      <div style="display:flex; align-items:center;">
        <span class="legend-color-dot" style="background-color: ${palette[i % palette.length]};"></span>
        <span>${escapeHtml(cat)}</span>
      </div>
      <div>
        <strong class="tabular-nums" style="color: #0f172a;">${formatCurrency(val)}</strong>
        <span style="font-size:0.7rem; color:#94a3b8; margin-left:4px;">(${pct}%)</span>
      </div>
    `;
    legendContainer.appendChild(item);
  });
}

// =============================================================================
// 6. Add / Edit Expense Form & Live Preview Controller
// =============================================================================
function initExpenseForm() {
  const form = document.getElementById('expenseForm');
  const dateInput = document.getElementById('expenseDate');
  const titleInput = document.getElementById('expenseTitle');
  const catSelect = document.getElementById('expenseCategory');
  const vendorInput = document.getElementById('expenseVendor');
  const amountInput = document.getElementById('expenseAmount');
  const methodSelect = document.getElementById('expensePaymentMethod');
  const paidByInput = document.getElementById('expensePaidBy');
  const statusSelect = document.getElementById('expenseStatus');
  const transportBox = document.getElementById('transportProviderBox');
  const providerCards = document.querySelectorAll('.provider-radio-card');

  // Set default date to today
  dateInput.value = '2026-10-29';
  paidByInput.value = state.settings.employeeName;

  // Real-time synchronization to Live Preview Voucher
  function updateLivePreview() {
    const amountVal = parseFloat(amountInput.value) || 0;
    document.getElementById('livePreviewAmount').textContent = formatCurrency(amountVal);
    document.getElementById('livePreviewId').textContent = state.editingExpenseId || state.generateNextExpenseId();
    document.getElementById('livePreviewDate').textContent = formatDate(dateInput.value);
    document.getElementById('livePreviewTitle').textContent = titleInput.value.trim() || 'Untitled Expense';
    document.getElementById('livePreviewCategory').textContent = catSelect.value || 'General';
    document.getElementById('livePreviewVendor').textContent = vendorInput.value.trim() || 'Not specified';
    document.getElementById('livePreviewPaidBy').textContent = paidByInput.value.trim() || state.settings.employeeName;
    document.getElementById('livePreviewMethod').textContent = methodSelect.value || 'Personal Cash';
    document.getElementById('livePreviewAttachmentCount').textContent = `${state.stagedAttachments.length} file(s)`;

    // Check personal vs company payment callout
    const isCompanyCash = methodSelect.value === 'Company Cash';
    const callout = document.getElementById('livePreviewCallout');
    const badge = document.getElementById('livePreviewBadge');
    const badgeText = document.getElementById('livePreviewBadgeText');

    if (isCompanyCash) {
      callout.className = 'reimbursement-callout company';
      callout.innerHTML = `<strong>Company Petty Float Expense:</strong> Paid directly from office cash. No personal reimbursement required.`;
      badge.className = 'status-badge na';
      badgeText.textContent = 'Company Paid';
      statusSelect.value = 'Not Applicable';
    } else {
      callout.className = 'reimbursement-callout personal';
      callout.innerHTML = `<strong>Personal Out-of-Pocket Expense:</strong> This will be automatically added to your reimbursement claim queue.`;
      const currentSt = statusSelect.value === 'Not Applicable' ? 'Pending' : statusSelect.value;
      badge.className = `status-badge ${getBadgeClass(currentSt)}`;
      badgeText.textContent = `${currentSt} Claim`;
    }
  }

  // Input event triggers
  [dateInput, titleInput, catSelect, vendorInput, amountInput, methodSelect, paidByInput, statusSelect].forEach(elem => {
    elem.addEventListener('input', updateLivePreview);
    elem.addEventListener('change', updateLivePreview);
  });

  // Handle Transport category toggle (PickMe / Uber selection box)
  catSelect.addEventListener('change', () => {
    if (catSelect.value === 'Transport') {
      transportBox.classList.add('show');
    } else {
      transportBox.classList.remove('show');
    }
    updateLivePreview();
  });

  // Transport provider radio selection
  providerCards.forEach(card => {
    card.addEventListener('click', () => {
      providerCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const prov = card.dataset.provider;
      document.getElementById('selectedTransportProvider').value = prov;
      // Prepopulate vendor if empty
      if (prov === 'PickMe' && !vendorInput.value) vendorInput.value = 'PickMe Sri Lanka';
      if (prov === 'Uber' && !vendorInput.value) vendorInput.value = 'Uber Sri Lanka';
      updateLivePreview();
    });
  });

  // Cancel button
  document.getElementById('cancelExpenseFormBtn').addEventListener('click', () => {
    resetExpenseForm();
    navigateTo('transactions');
  });

  // Print Receipts (A4) button
  const printA4Btn = document.getElementById('printReceiptsA4Btn');
  if (printA4Btn) {
    printA4Btn.addEventListener('click', () => {
      printUploadedReceiptsA4();
    });
  }

  const quickPrintBtn = document.getElementById('quickPrintAttachmentsBtn');
  if (quickPrintBtn) {
    quickPrintBtn.addEventListener('click', () => {
      printUploadedReceiptsA4();
    });
  }

  // Save & Add Another button
  document.getElementById('saveAndAddAnotherBtn').addEventListener('click', () => {
    if (saveExpenseRecord(true)) {
      resetExpenseForm();
      showToast('Expense Saved', 'Record added successfully. Ready for next entry.', 'success');
      navigateTo('add-expense');
    }
  });

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (saveExpenseRecord(false)) {
      showToast('Expense Saved', 'Expense record successfully saved.', 'success');
      resetExpenseForm();
      navigateTo('transactions');
    }
  });

  // Initial preview sync
  updateLivePreview();
}

function resetExpenseForm() {
  document.getElementById('expenseForm').reset();
  document.getElementById('editExpenseId').value = '';
  document.getElementById('expenseDate').value = '2026-10-29';
  document.getElementById('expensePaidBy').value = state.settings.employeeName;
  document.getElementById('formCardHeaderTitle').textContent = 'Record New Office Expense';
  document.getElementById('saveExpenseBtn').innerHTML = `<i data-lucide="check"></i> <span>Save Expense Record</span>`;
  document.getElementById('transportProviderBox').classList.remove('show');
  state.editingExpenseId = null;
  state.stagedAttachments = [];
  renderAttachmentPreviews();
  
  // Trigger update to reset preview card
  const amountInput = document.getElementById('expenseAmount');
  amountInput.dispatchEvent(new Event('input'));
  if (window.lucide) window.lucide.createIcons();
}

function populateFormForEdit(txId) {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;

  state.editingExpenseId = tx.id;
  navigateTo('add-expense');

  document.getElementById('formCardHeaderTitle').textContent = `Edit Expense (${tx.id})`;
  document.getElementById('saveExpenseBtn').innerHTML = `<i data-lucide="save"></i> <span>Update Record</span>`;
  document.getElementById('editExpenseId').value = tx.id;
  document.getElementById('expenseDate').value = tx.date;
  document.getElementById('expenseTitle').value = tx.title;
  document.getElementById('expenseCategory').value = tx.category;
  document.getElementById('expenseVendor').value = tx.vendor;
  document.getElementById('expenseAmount').value = tx.amount;
  document.getElementById('expensePaymentMethod').value = tx.paymentMethod;
  document.getElementById('expensePaidBy').value = tx.paidBy;
  document.getElementById('expenseStatus').value = tx.reimbursementStatus;
  document.getElementById('expenseDescription').value = tx.description || '';
  document.getElementById('expenseNotes').value = tx.notes || '';

  if (tx.category === 'Transport') {
    document.getElementById('transportProviderBox').classList.add('show');
    document.querySelectorAll('.provider-radio-card').forEach(c => {
      c.classList.toggle('active', c.dataset.provider === (tx.transportProvider || 'PickMe'));
    });
    document.getElementById('selectedTransportProvider').value = tx.transportProvider || 'PickMe';
  }

  // Staged attachments
  state.stagedAttachments = tx.attachments ? [...tx.attachments] : [];
  renderAttachmentPreviews();

  // Force preview update
  document.getElementById('expenseAmount').dispatchEvent(new Event('input'));
  if (window.lucide) window.lucide.createIcons();
}

function saveExpenseRecord(isSaveAndAddAnother = false) {
  const date = document.getElementById('expenseDate').value;
  const title = document.getElementById('expenseTitle').value.trim();
  const category = document.getElementById('expenseCategory').value;
  const vendor = document.getElementById('expenseVendor').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const paymentMethod = document.getElementById('expensePaymentMethod').value;
  const paidBy = document.getElementById('expensePaidBy').value.trim();
  let reimbursementStatus = document.getElementById('expenseStatus').value;
  const description = document.getElementById('expenseDescription').value.trim();
  const notes = document.getElementById('expenseNotes').value.trim();
  const transportProvider = category === 'Transport' ? document.getElementById('selectedTransportProvider').value : 'Other';

  if (!date || !title || !category || !vendor || isNaN(amount) || amount <= 0) {
    showToast('Validation Error', 'Please complete all required fields with valid values.', 'error');
    return false;
  }

  const isPersonalExpense = paymentMethod !== 'Company Cash';
  if (!isPersonalExpense) {
    reimbursementStatus = 'Not Applicable';
  }

  const nowIso = new Date().toISOString();
  let txId = state.editingExpenseId;

  if (txId) {
    // Update existing record
    const index = state.transactions.findIndex(t => t.id === txId);
    if (index !== -1) {
      const existing = state.transactions[index];
      const history = existing.reimbursementHistory || [];
      if (existing.reimbursementStatus !== reimbursementStatus) {
        history.push({
          date: date,
          status: reimbursementStatus,
          note: `Status updated during edit`
        });
      }
      state.transactions[index] = {
        ...existing,
        date,
        title,
        category,
        vendor,
        amount,
        paymentMethod,
        paidBy,
        reimbursementStatus,
        isPersonalExpense,
        description,
        notes,
        transportProvider,
        attachments: [...state.stagedAttachments],
        updatedAt: nowIso
      };
    }
  } else {
    // Create new record
    txId = state.generateNextExpenseId();
    const newRecord = {
      id: txId,
      date,
      time: new Date().toTimeString().substring(0, 5),
      title,
      category,
      vendor,
      amount,
      paymentMethod,
      paidBy,
      reimbursementStatus,
      isPersonalExpense,
      description,
      notes,
      transportProvider,
      reimbursementHistory: [
        {
          date,
          status: reimbursementStatus,
          note: isPersonalExpense ? 'Claim initiated' : 'Paid with Company Cash Float'
        }
      ],
      attachments: [...state.stagedAttachments],
      isSample: false,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    state.transactions.unshift(newRecord);
  }

  // Persist transactions
  state.persistTransactions();
  return true;
}

// =============================================================================
// 7. Drag-and-Drop Receipt & Screenshot Manager
// =============================================================================
function initReceiptUpload() {
  const dropzone = document.getElementById('receiptDropzone');
  const fileInput = document.getElementById('receiptFileInput');

  dropzone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleIncomingFiles(files);
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    handleIncomingFiles(files);
    fileInput.value = ''; // Reset input to allow selecting same file again
  });
}

function handleIncomingFiles(fileList) {
  if (!fileList || fileList.length === 0) return;

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/svg+xml'];
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit per file

  Array.from(fileList).forEach(file => {
    if (!validTypes.includes(file.type)) {
      showToast('Unsupported File Format', `File "${file.name}" is not a supported image (JPG, PNG, WebP) or PDF receipt.`, 'error');
      return;
    }
    if (file.size > maxSizeBytes) {
      showToast('File Too Large', `File "${file.name}" exceeds the 5MB upload limit.`, 'error');
      return;
    }

    const reader = new FileReader();
    const isPdf = file.type === 'application/pdf';
    const attachmentId = 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const attachmentObj = {
        id: attachmentId,
        name: file.name,
        size: file.size,
        type: file.type,
        isPdf: isPdf,
        dataUrl: dataUrl
      };

      // Also store in IndexedDB for resilience
      await attachmentStore.saveAttachment(attachmentId, dataUrl);

      state.stagedAttachments.push(attachmentObj);
      renderAttachmentPreviews();
      document.getElementById('livePreviewAttachmentCount').textContent = `${state.stagedAttachments.length} file(s)`;
      showToast('Receipt Attached', `Attached "${file.name}" (${(file.size / 1024).toFixed(1)} KB).`, 'success');
    };

    reader.onerror = () => {
      showToast('File Error', `Failed to read file "${file.name}".`, 'error');
    };

    reader.readAsDataURL(file);
  });
}

function renderAttachmentPreviews() {
  const container = document.getElementById('attachmentPreviewContainer');
  container.innerHTML = '';

  state.stagedAttachments.forEach((att, index) => {
    const card = document.createElement('div');
    card.className = 'attachment-preview-card';

    let thumbContent = '';
    if (att.isPdf) {
      thumbContent = `
        <div class="attachment-pdf-icon">
          <i data-lucide="file-text" style="width: 28px; height: 28px;"></i>
          <span>PDF RECEIPT</span>
        </div>
      `;
    } else {
      thumbContent = ``;
    }

    card.innerHTML = `
      <div class="attachment-thumb" style="${att.isPdf ? '' : `background-image: url('${att.dataUrl}');`}" data-index="${index}">
        ${thumbContent}
      </div>
      <div class="attachment-info-bar" title="${escapeHtml(att.name)}">
        ${escapeHtml(att.name)}
      </div>
      <button type="button" class="attachment-remove-btn" data-index="${index}" title="Remove attachment">
        ×
      </button>
    `;

    // Click thumb to preview in lightbox
    card.querySelector('.attachment-thumb').addEventListener('click', () => {
      openReceiptLightbox(att);
    });

    // Remove attachment
    card.querySelector('.attachment-remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      state.stagedAttachments.splice(index, 1);
      renderAttachmentPreviews();
      document.getElementById('livePreviewAttachmentCount').textContent = `${state.stagedAttachments.length} file(s)`;
    });

    container.appendChild(card);
  });

  // Toggle quick print button in attachments header
  const quickPrintBtn = document.getElementById('quickPrintAttachmentsBtn');
  if (quickPrintBtn) {
    quickPrintBtn.style.display = state.stagedAttachments.length > 0 ? 'inline-flex' : 'none';
  }

  if (window.lucide) window.lucide.createIcons();
}

function openReceiptLightbox(attachment) {
  const modal = document.getElementById('receiptLightboxModal');
  const img = document.getElementById('lightboxImage');
  const pdfViewer = document.getElementById('lightboxPdfViewer');
  const pdfName = document.getElementById('lightboxPdfName');
  const pdfDownload = document.getElementById('lightboxPdfDownloadBtn');
  const title = document.getElementById('lightboxTitle');
  const fileInfo = document.getElementById('lightboxFileInfo');
  const imgDownload = document.getElementById('lightboxDownloadBtn');

  title.textContent = `Receipt Proof: ${attachment.name}`;
  fileInfo.textContent = `${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)`;

  if (attachment.isPdf) {
    img.style.display = 'none';
    imgDownload.style.display = 'none';
    pdfViewer.style.display = 'block';
    pdfName.textContent = attachment.name;
    pdfDownload.href = attachment.dataUrl;
    pdfDownload.download = attachment.name;
  } else {
    pdfViewer.style.display = 'none';
    img.style.display = 'block';
    img.src = attachment.dataUrl;
    imgDownload.style.display = 'inline-flex';
    imgDownload.onclick = () => {
      const a = document.createElement('a');
      a.href = attachment.dataUrl;
      a.download = attachment.name;
      a.click();
    };
  }

  openModal('receiptLightboxModal');
}

// =============================================================================
// 8. All Transactions Table, Filter, Search & CSV Exporter
// =============================================================================
function initTransactionsView() {
  const searchInput = document.getElementById('txSearchInput');
  const dateFrom = document.getElementById('txFilterDateFrom');
  const dateTo = document.getElementById('txFilterDateTo');
  const catSelect = document.getElementById('txFilterCategory');
  const methodSelect = document.getElementById('txFilterPaymentMethod');
  const statusSelect = document.getElementById('txFilterStatus');
  const sortBySelect = document.getElementById('txSortBy');
  const resetBtn = document.getElementById('txResetFiltersBtn');
  const emptyResetBtn = document.getElementById('txClearFiltersEmptyBtn');
  const exportBtn = document.getElementById('txExportCsvBtn');
  const addNewBtn = document.getElementById('txAddNewBtn');

  function handleFilterChange() {
    state.txCurrentPage = 1;
    renderTransactionsTable();
  }

  [searchInput, dateFrom, dateTo, catSelect, methodSelect, statusSelect, sortBySelect].forEach(el => {
    el.addEventListener('input', handleFilterChange);
    el.addEventListener('change', handleFilterChange);
  });

  function clearAllFilters() {
    searchInput.value = '';
    dateFrom.value = '';
    dateTo.value = '';
    catSelect.value = 'ALL';
    methodSelect.value = 'ALL';
    statusSelect.value = 'ALL';
    sortBySelect.value = 'date-desc';
    state.txCurrentPage = 1;
    renderTransactionsTable();
    showToast('Filters Reset', 'All search and category filters cleared.', 'info');
  }

  resetBtn.addEventListener('click', clearAllFilters);
  emptyResetBtn.addEventListener('click', clearAllFilters);

  addNewBtn.addEventListener('click', () => {
    state.editingExpenseId = null;
    navigateTo('add-expense');
  });

  exportBtn.addEventListener('click', () => {
    const filtered = getFilteredTransactions();
    exportToCsv(filtered, 'PettyFlow_Transactions.csv');
  });
}

function getFilteredTransactions() {
  const query = (document.getElementById('txSearchInput').value || '').toLowerCase().trim();
  const from = document.getElementById('txFilterDateFrom').value;
  const to = document.getElementById('txFilterDateTo').value;
  const category = document.getElementById('txFilterCategory').value;
  const method = document.getElementById('txFilterPaymentMethod').value;
  const status = document.getElementById('txFilterStatus').value;
  const sortBy = document.getElementById('txSortBy').value;

  let list = state.transactions.filter(tx => {
    // Search query
    if (query) {
      const match =
        (tx.id && tx.id.toLowerCase().includes(query)) ||
        (tx.title && tx.title.toLowerCase().includes(query)) ||
        (tx.vendor && tx.vendor.toLowerCase().includes(query)) ||
        (tx.description && tx.description.toLowerCase().includes(query)) ||
        (tx.amount && tx.amount.toString().includes(query));
      if (!match) return false;
    }
    // Date from
    if (from && tx.date < from) return false;
    // Date to
    if (to && tx.date > to) return false;
    // Category
    if (category !== 'ALL' && tx.category !== category) return false;
    // Method
    if (method !== 'ALL' && tx.paymentMethod !== method) return false;
    // Status
    if (status !== 'ALL' && tx.reimbursementStatus !== status) return false;

    return true;
  });

  // Sorting
  list.sort((a, b) => {
    if (sortBy === 'date-desc') {
      return new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00'));
    } else if (sortBy === 'date-asc') {
      return new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00'));
    } else if (sortBy === 'amount-desc') {
      return Number(b.amount) - Number(a.amount);
    } else if (sortBy === 'amount-asc') {
      return Number(a.amount) - Number(b.amount);
    }
    return 0;
  });

  return list;
}

function renderTransactionsTable() {
  const filtered = getFilteredTransactions();
  const totalItems = filtered.length;
  const pageSize = state.txPageSize;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (state.txCurrentPage > totalPages) state.txCurrentPage = totalPages;
  const startIdx = (state.txCurrentPage - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  const tbody = document.getElementById('allTxTbody');
  const mobileContainer = document.getElementById('allTxMobileContainer');
  const emptyState = document.getElementById('txEmptyState');
  tbody.innerHTML = '';
  mobileContainer.innerHTML = '';

  if (totalItems === 0) {
    emptyState.style.display = 'flex';
    document.getElementById('txPaginationSummary').textContent = 'Showing 0 entries';
    document.getElementById('txPaginationButtons').innerHTML = '';
    return;
  }

  emptyState.style.display = 'none';

  pageItems.forEach(tx => {
    const tr = document.createElement('tr');
    const badgeClass = getBadgeClass(tx.reimbursementStatus);
    const receiptBadge = tx.attachments && tx.attachments.length > 0
      ? `<span class="receipt-indicator" data-id="${tx.id}"><i data-lucide="paperclip" style="width:13px;height:13px;"></i> ${tx.attachments.length}</span>`
      : `<span class="receipt-indicator none"><i data-lucide="minus" style="width:13px;height:13px;"></i></span>`;

    tr.innerHTML = `
      <td><span class="expense-id-cell">${escapeHtml(tx.id)}</span></td>
      <td>${formatDate(tx.date)}</td>
      <td style="max-width: 220px;">
        <div style="font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(tx.title)}">
          ${escapeHtml(tx.title)}
        </div>
      </td>
      <td>${escapeHtml(tx.vendor)}</td>
      <td><span class="category-tag">${escapeHtml(tx.category)}</span></td>
      <td><span class="payment-tag">${escapeHtml(tx.paymentMethod)}</span></td>
      <td class="tabular-nums" style="font-weight: 700; color: #0f172a;">${formatCurrency(tx.amount)}</td>
      <td>
        <span class="status-badge ${badgeClass}">
          <span class="badge-circle"></span>
          <span>${escapeHtml(tx.reimbursementStatus)}</span>
        </span>
      </td>
      <td>${receiptBadge}</td>
      <td style="text-align: right;">
        <div class="table-actions" style="justify-content: flex-end;">
          <button class="btn-icon-action view-tx-btn" data-id="${tx.id}" title="View Details">
            <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
          </button>
          <button class="btn-icon-action edit-tx-btn" data-id="${tx.id}" title="Edit Expense">
            <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
          </button>
          <button class="btn-icon-action danger delete-tx-btn" data-id="${tx.id}" title="Delete Record">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);

    // Mobile View Card
    const mCard = document.createElement('div');
    mCard.className = 'mobile-transaction-card';
    mCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <span class="expense-id-cell">${escapeHtml(tx.id)}</span>
        <span class="status-badge ${badgeClass}"><span class="badge-circle"></span>${escapeHtml(tx.reimbursementStatus)}</span>
      </div>
      <div style="font-weight:700; font-size:0.95rem; margin-bottom:0.25rem;">${escapeHtml(tx.title)}</div>
      <div style="font-size:0.8rem; color:#64748b; margin-bottom:0.4rem;">${escapeHtml(tx.vendor)} • ${escapeHtml(tx.category)}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:#64748b; margin-bottom:0.75rem;">
        <span>${formatDate(tx.date)} (${escapeHtml(tx.paymentMethod)})</span>
        <strong style="font-size:1.1rem; color:#0f172a;" class="tabular-nums">${formatCurrency(tx.amount)}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:0.5rem;">
        <div>${receiptBadge}</div>
        <div style="display:flex; gap:0.4rem;">
          <button class="btn-secondary view-tx-btn" data-id="${tx.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem;">View</button>
          <button class="btn-secondary edit-tx-btn" data-id="${tx.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem;">Edit</button>
          <button class="btn-secondary delete-tx-btn" data-id="${tx.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem; color:#ef4444;">Delete</button>
        </div>
      </div>
    `;
    mobileContainer.appendChild(mCard);
  });

  // Update Pagination Controls
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  document.getElementById('txPaginationSummary').textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalItems} entries`;

  renderPaginationButtons(totalPages);
  attachRowActionListeners(tbody);
  attachRowActionListeners(mobileContainer);
  if (window.lucide) window.lucide.createIcons();
}

function renderPaginationButtons(totalPages) {
  const container = document.getElementById('txPaginationButtons');
  container.innerHTML = '';
  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '&larr; Prev';
  prevBtn.disabled = state.txCurrentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (state.txCurrentPage > 1) {
      state.txCurrentPage--;
      renderTransactionsTable();
    }
  });
  container.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-btn ${i === state.txCurrentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      state.txCurrentPage = i;
      renderTransactionsTable();
    });
    container.appendChild(pageBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = 'Next &rarr;';
  nextBtn.disabled = state.txCurrentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (state.txCurrentPage < totalPages) {
      state.txCurrentPage++;
      renderTransactionsTable();
    }
  });
  container.appendChild(nextBtn);
}

function attachRowActionListeners(container) {
  container.querySelectorAll('.view-tx-btn').forEach(btn => {
    btn.addEventListener('click', () => openTransactionDetailsModal(btn.dataset.id));
  });

  container.querySelectorAll('.edit-tx-btn').forEach(btn => {
    btn.addEventListener('click', () => populateFormForEdit(btn.dataset.id));
  });

  container.querySelectorAll('.delete-tx-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteTransaction(btn.dataset.id));
  });

  container.querySelectorAll('.receipt-indicator').forEach(elem => {
    elem.addEventListener('click', () => {
      const id = elem.dataset.id;
      if (!id) return;
      const tx = state.transactions.find(t => t.id === id);
      if (tx && tx.attachments && tx.attachments.length > 0) {
        openReceiptLightbox(tx.attachments[0]);
      }
    });
  });
}

function confirmDeleteTransaction(txId) {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;

  openConfirmModal(
    'Delete Expense Record',
    `Are you sure you want to permanently delete expense "${tx.title}" (${formatCurrency(tx.amount)})? This action cannot be undone.`,
    () => {
      state.transactions = state.transactions.filter(t => t.id !== txId);
      state.persistTransactions();
      showToast('Record Deleted', `Expense ${txId} has been deleted.`, 'success');
      renderDashboard();
      renderTransactionsTable();
      renderReimbursementsView();
    }
  );
}

// =============================================================================
// 9. Reimbursement Workflow Engine
// =============================================================================
function initReimbursementsView() {
  document.querySelectorAll('.reimburse-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.reimburse-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.reimburseActiveTab = btn.dataset.tab;
      renderReimbursementsView();
    });
  });

  // Status Modal Form Submission
  const statusForm = document.getElementById('statusUpdateForm');
  statusForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const txId = document.getElementById('statusModalTxId').value;
    const newStatus = document.getElementById('statusModalSelect').value;
    const actionDate = document.getElementById('statusModalDate').value || new Date().toISOString().split('T')[0];
    const notes = document.getElementById('statusModalNotes').value.trim();

    const tx = state.transactions.find(t => t.id === txId);
    if (tx) {
      tx.reimbursementStatus = newStatus;
      tx.reimbursementHistory = tx.reimbursementHistory || [];
      tx.reimbursementHistory.push({
        date: actionDate,
        status: newStatus,
        note: notes || `Status changed to ${newStatus}`
      });
      tx.updatedAt = new Date().toISOString();
      state.persistTransactions();
      closeModal('statusModal');
      showToast('Status Updated', `Claim ${txId} marked as ${newStatus}.`, 'success');
      renderReimbursementsView();
      renderDashboard();
    }
  });

  document.getElementById('statusModalCancelBtn').addEventListener('click', () => {
    closeModal('statusModal');
  });
  document.getElementById('closeStatusModalBtn').addEventListener('click', () => {
    closeModal('statusModal');
  });
}

function renderReimbursementsView() {
  const calcs = state.getCalculations();

  // Summary Cards
  document.getElementById('reimbKpiDraft').textContent = formatCurrency(calculateStatusTotal('Pending'));
  document.getElementById('reimbKpiDraftCount').textContent = `${calcs.pendingCount} pending drafts`;
  document.getElementById('reimbKpiSubmitted').textContent = formatCurrency(calculateStatusTotal('Submitted'));
  document.getElementById('reimbKpiSubmittedCount').textContent = `${calcs.submittedCount} filed claims`;
  document.getElementById('reimbKpiApproved').textContent = formatCurrency(calculateStatusTotal('Approved'));
  document.getElementById('reimbKpiApprovedCount').textContent = `${calcs.approvedCount} approved claims`;
  document.getElementById('reimbKpiPaid').textContent = formatCurrency(calcs.totalReimbursed);
  document.getElementById('reimbKpiPaidCount').textContent = `${calcs.reimbursedCount} settled claims`;

  // Tab count badges
  const personalList = state.transactions.filter(t => t.paymentMethod !== 'Company Cash');
  document.getElementById('reimbTabBadgeAll').textContent = personalList.length;
  document.getElementById('reimbTabBadgePending').textContent = personalList.filter(t => t.reimbursementStatus === 'Pending').length;
  document.getElementById('reimbTabBadgeSubmitted').textContent = personalList.filter(t => t.reimbursementStatus === 'Submitted').length;
  document.getElementById('reimbTabBadgeApproved').textContent = personalList.filter(t => t.reimbursementStatus === 'Approved').length;
  document.getElementById('reimbTabBadgeReimbursed').textContent = personalList.filter(t => t.reimbursementStatus === 'Reimbursed').length;

  // Filter claims by active tab
  const activeTab = state.reimburseActiveTab;
  let claims = personalList;
  if (activeTab !== 'ALL') {
    claims = claims.filter(t => t.reimbursementStatus === activeTab);
  }

  const container = document.getElementById('reimbursementClaimsList');
  const emptyState = document.getElementById('reimbursementEmptyState');
  container.innerHTML = '';

  if (claims.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }
  emptyState.style.display = 'none';

  claims.forEach(tx => {
    const card = document.createElement('div');
    card.className = 'claim-card';
    const statusClass = getBadgeClass(tx.reimbursementStatus);

    // Build timeline stepper indicators
    const isStepSubmitted = ['Submitted', 'Approved', 'Reimbursed'].includes(tx.reimbursementStatus);
    const isStepApproved = ['Approved', 'Reimbursed'].includes(tx.reimbursementStatus);
    const isStepPaid = tx.reimbursementStatus === 'Reimbursed';

    let actionButtons = '';
    if (tx.reimbursementStatus === 'Pending') {
      actionButtons = `
        <button class="btn-primary-alt submit-claim-btn" data-id="${tx.id}">
          <i data-lucide="send" style="width:13px;height:13px;"></i> Submit Claim
        </button>
      `;
    } else if (tx.reimbursementStatus === 'Submitted') {
      actionButtons = `
        <button class="btn-primary-alt approve-claim-btn" data-id="${tx.id}" style="border-color:#c7d2fe; color:#4338ca; background:#eef2ff;">
          <i data-lucide="check" style="width:13px;height:13px;"></i> Approve Claim
        </button>
      `;
    } else if (tx.reimbursementStatus === 'Approved') {
      actionButtons = `
        <button class="btn-primary settle-claim-btn" data-id="${tx.id}" style="background-color:#10b981;">
          <i data-lucide="check-circle" style="width:13px;height:13px;"></i> Mark Reimbursed
        </button>
      `;
    }

    const receiptThumb = tx.attachments && tx.attachments.length > 0
      ? `<button class="btn-secondary reimb-view-receipt-btn" data-id="${tx.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem;">
          <i data-lucide="image" style="width:12px;height:12px;"></i> Receipt (${tx.attachments.length})
         </button>`
      : '';

    card.innerHTML = `
      <div class="claim-indicator-strip ${statusClass}"></div>
      <div class="claim-main-info">
        <div class="claim-header-row">
          <span class="expense-id-cell">${escapeHtml(tx.id)}</span>
          <span class="claim-title">${escapeHtml(tx.title)}</span>
          <span class="status-badge ${statusClass}"><span class="badge-circle"></span>${escapeHtml(tx.reimbursementStatus)}</span>
        </div>
        <div class="claim-meta-row">
          <span><strong>Date:</strong> ${formatDate(tx.date)}</span>
          <span><strong>Category:</strong> ${escapeHtml(tx.category)}</span>
          <span><strong>Vendor:</strong> ${escapeHtml(tx.vendor)}</span>
          <span><strong>Paid via:</strong> ${escapeHtml(tx.paymentMethod)}</span>
          <span><strong>Claimant:</strong> ${escapeHtml(tx.paidBy)}</span>
        </div>
        <div class="timeline-stepper">
          <div class="timeline-step">
            <span class="step-circle done">✓</span>
            <span>Recorded</span>
          </div>
          <span class="step-line ${isStepSubmitted ? 'done' : ''}"></span>
          <div class="timeline-step">
            <span class="step-circle ${isStepSubmitted ? 'done' : ''}">✓</span>
            <span>Submitted</span>
          </div>
          <span class="step-line ${isStepApproved ? 'done' : ''}"></span>
          <div class="timeline-step">
            <span class="step-circle ${isStepApproved ? 'done' : ''}">✓</span>
            <span>Approved</span>
          </div>
          <span class="step-line ${isStepPaid ? 'done' : ''}"></span>
          <div class="timeline-step">
            <span class="step-circle ${isStepPaid ? 'done' : ''}">✓</span>
            <span>Reimbursed</span>
          </div>
        </div>
      </div>
      <div class="claim-amount-action">
        <div class="claim-amount tabular-nums">${formatCurrency(tx.amount)}</div>
        <div class="claim-actions-group">
          ${receiptThumb}
          ${actionButtons}
          <button class="btn-icon-action change-status-btn" data-id="${tx.id}" title="Change status or add note">
            <i data-lucide="more-horizontal" style="width:15px;height:15px;"></i>
          </button>
        </div>
      </div>
    `;

    // Action handlers
    const submitBtn = card.querySelector('.submit-claim-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => advanceClaimStatus(tx.id, 'Submitted'));
    }

    const approveBtn = card.querySelector('.approve-claim-btn');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => advanceClaimStatus(tx.id, 'Approved'));
    }

    const settleBtn = card.querySelector('.settle-claim-btn');
    if (settleBtn) {
      settleBtn.addEventListener('click', () => openStatusAdvanceModal(tx.id, 'Reimbursed'));
    }

    const changeStatusBtn = card.querySelector('.change-status-btn');
    if (changeStatusBtn) {
      changeStatusBtn.addEventListener('click', () => openStatusAdvanceModal(tx.id));
    }

    const receiptBtn = card.querySelector('.reimb-view-receipt-btn');
    if (receiptBtn) {
      receiptBtn.addEventListener('click', () => {
        if (tx.attachments && tx.attachments.length > 0) {
          openReceiptLightbox(tx.attachments[0]);
        }
      });
    }

    container.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

function calculateStatusTotal(status) {
  return state.transactions
    .filter(t => t.paymentMethod !== 'Company Cash' && t.reimbursementStatus === status)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

function advanceClaimStatus(txId, nextStatus) {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;

  tx.reimbursementStatus = nextStatus;
  tx.reimbursementHistory = tx.reimbursementHistory || [];
  tx.reimbursementHistory.push({
    date: new Date().toISOString().split('T')[0],
    status: nextStatus,
    note: `Advanced to ${nextStatus}`
  });
  tx.updatedAt = new Date().toISOString();
  state.persistTransactions();
  showToast('Status Updated', `Claim ${txId} is now ${nextStatus}.`, 'success');
  renderReimbursementsView();
  renderDashboard();
}

function openStatusAdvanceModal(txId, defaultStatus = null) {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;

  document.getElementById('statusModalTxId').value = tx.id;
  document.getElementById('statusModalSelect').value = defaultStatus || tx.reimbursementStatus;
  document.getElementById('statusModalDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('statusModalNotes').value = '';
  openModal('statusModal');
}

// =============================================================================
// 10. Reports, Transport Comparison & Printable Statement Controller
// =============================================================================
function initReportsView() {
  const timeframeSelect = document.getElementById('reportTimeframeSelect');
  const customRange = document.getElementById('reportCustomRangeContainer');
  const dateFrom = document.getElementById('reportDateFrom');
  const dateTo = document.getElementById('reportDateTo');
  const printBtn = document.getElementById('printReportBtn');
  const exportBtn = document.getElementById('exportReportCsvBtn');

  timeframeSelect.addEventListener('change', () => {
    if (timeframeSelect.value === 'CUSTOM') {
      customRange.style.display = 'block';
    } else {
      customRange.style.display = 'none';
      renderReportsView();
    }
  });

  [dateFrom, dateTo].forEach(el => {
    el.addEventListener('change', renderReportsView);
  });

  printBtn.addEventListener('click', () => {
    window.print();
  });

  exportBtn.addEventListener('click', () => {
    const reportData = getReportFilteredData();
    exportToCsv(reportData, `PettyFlow_Report_${timeframeSelect.value}.csv`);
  });
}

function getReportFilteredData() {
  const timeframe = document.getElementById('reportTimeframeSelect').value;
  let from = null;
  let to = null;

  if (timeframe === 'THIS_MONTH') {
    from = '2026-10-01';
    to = '2026-10-31';
  } else if (timeframe === 'LAST_MONTH') {
    from = '2026-09-01';
    to = '2026-09-30';
  } else if (timeframe === 'THIS_YEAR') {
    from = '2026-01-01';
    to = '2026-12-31';
  } else if (timeframe === 'CUSTOM') {
    from = document.getElementById('reportDateFrom').value || null;
    to = document.getElementById('reportDateTo').value || null;
  }

  return state.transactions.filter(t => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    return true;
  });
}

function renderReportsView() {
  const reportRecords = getReportFilteredData();

  // 1. PickMe vs. Uber Comparison Breakdown
  let pickMeTotal = 0;
  let uberTotal = 0;
  let otherTransitTotal = 0;

  reportRecords.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.category === 'Transport' || t.category === 'Fuel') {
      const prov = (t.transportProvider || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      const vendor = (t.vendor || '').toLowerCase();

      if (prov.includes('pickme') || title.includes('pickme') || vendor.includes('pickme')) {
        pickMeTotal += amt;
      } else if (prov.includes('uber') || title.includes('uber') || vendor.includes('uber')) {
        uberTotal += amt;
      } else {
        otherTransitTotal += amt;
      }
    }
  });

  const totalTransport = pickMeTotal + uberTotal + otherTransitTotal;
  const pmPct = totalTransport > 0 ? ((pickMeTotal / totalTransport) * 100).toFixed(1) : 0;
  const ubPct = totalTransport > 0 ? ((uberTotal / totalTransport) * 100).toFixed(1) : 0;
  const otPct = totalTransport > 0 ? ((otherTransitTotal / totalTransport) * 100).toFixed(1) : 0;

  document.getElementById('reportPickMeTotal').textContent = `${formatCurrency(pickMeTotal)} (${pmPct}%)`;
  document.getElementById('reportPickMeBar').style.width = `${pmPct}%`;

  document.getElementById('reportUberTotal').textContent = `${formatCurrency(uberTotal)} (${ubPct}%)`;
  document.getElementById('reportUberBar').style.width = `${ubPct}%`;

  document.getElementById('reportOtherTransitTotal').textContent = `${formatCurrency(otherTransitTotal)} (${otPct}%)`;
  document.getElementById('reportOtherTransitBar').style.width = `${otPct}%`;

  // 2. Personal vs Company Cash Payment Source Distribution
  let personalTotal = 0;
  let companyTotal = 0;

  reportRecords.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.paymentMethod === 'Company Cash') {
      companyTotal += amt;
    } else {
      personalTotal += amt;
    }
  });

  document.getElementById('reportPersonalTotal').textContent = formatCurrency(personalTotal);
  document.getElementById('reportCompanyTotal').textContent = formatCurrency(companyTotal);

  renderPaymentSourceChart(personalTotal, companyTotal);

  // 3. Render Printable Statement Sheet
  renderPrintableStatement(reportRecords);
}

function renderPaymentSourceChart(personal, company) {
  const canvas = document.getElementById('paymentSourceChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (state.charts.paymentSource) {
    state.charts.paymentSource.destroy();
  }

  state.charts.paymentSource = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Personal Out-of-Pocket', 'Company Petty Cash Float'],
      datasets: [{
        label: 'Expense Total (LKR)',
        data: [personal, company],
        backgroundColor: ['#f59e0b', '#06b6d4'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Total: ${formatCurrency(ctx.raw)}`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            callback: (val) => 'Rs. ' + (val >= 1000 ? (val / 1000) + 'k' : val)
          }
        }
      }
    }
  });
}

function renderPrintableStatement(records) {
  document.getElementById('reportPrintCompanyName').textContent = state.settings.companyName;
  document.getElementById('reportPrintEmployeeName').textContent = state.settings.employeeName;
  document.getElementById('reportPrintRole').textContent = state.settings.employeeRole;
  document.getElementById('reportPrintDate').textContent = new Date().toISOString().split('T')[0];
  document.getElementById('reportPrintPeriod').textContent = document.getElementById('reportTimeframeSelect').value;

  const tbody = document.getElementById('reportPrintTbody');
  tbody.innerHTML = '';

  let grandTotal = 0;
  let pendingTotal = 0;

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem;">No expense records found for this period.</td></tr>`;
  } else {
    records.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      grandTotal += amt;
      if (tx.paymentMethod !== 'Company Cash' && tx.reimbursementStatus !== 'Reimbursed') {
        pendingTotal += amt;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="expense-id-cell">${escapeHtml(tx.id)}</span></td>
        <td>${formatDate(tx.date)}</td>
        <td><strong>${escapeHtml(tx.title)}</strong></td>
        <td>${escapeHtml(tx.vendor)}</td>
        <td>${escapeHtml(tx.category)}</td>
        <td>${escapeHtml(tx.paymentMethod)}</td>
        <td>${escapeHtml(tx.reimbursementStatus)}</td>
        <td style="text-align: right;" class="tabular-nums"><strong>${formatCurrency(tx.amount)}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('reportPrintTotalAmount').textContent = formatCurrency(grandTotal);
  document.getElementById('reportPrintPendingAmount').textContent = formatCurrency(pendingTotal);
}

// =============================================================================
// 11. Settings & Backup/Restore Manager
// =============================================================================
function initSettingsView() {
  const profileForm = document.getElementById('settingsProfileForm');
  const exportJsonBtn = document.getElementById('exportDataJsonBtn');
  const importFileInput = document.getElementById('importJsonFileInput');
  const clearDemoBtn = document.getElementById('settingsClearDemoBtn');
  const resetAllBtn = document.getElementById('settingsResetAllBtn');
  const clearSampleBannerBtn = document.getElementById('clearSampleDataBtn');
  const restoreSampleBannerBtn = document.getElementById('restoreSampleDataBtn');

  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const companyName = document.getElementById('settingCompanyName').value.trim();
    const employeeName = document.getElementById('settingEmployeeName').value.trim();
    const employeeRole = document.getElementById('settingEmployeeRole').value.trim();

    state.saveSettings({ companyName, employeeName, employeeRole });
    updateUserProfileDisplays();
    showToast('Settings Saved', 'Profile settings updated successfully.', 'success');
  });

  // Export JSON Backup
  exportJsonBtn.addEventListener('click', () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      transactions: state.transactions
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PettyFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup Exported', 'Downloaded complete JSON backup.', 'success');
  });

  // Import JSON Backup
  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.transactions || !Array.isArray(imported.transactions)) {
          throw new Error('Invalid PettyFlow backup format');
        }

        openConfirmModal(
          'Restore Data from Backup',
          `Are you sure you want to restore ${imported.transactions.length} expense records from this backup? Current records will be replaced.`,
          () => {
            if (imported.settings) state.saveSettings(imported.settings);
            state.persistTransactions(imported.transactions);
            updateUserProfileDisplays();
            renderDashboard();
            renderSettingsView();
            showToast('Backup Restored', `Restored ${imported.transactions.length} records.`, 'success');
          }
        );
      } catch (err) {
        showToast('Import Error', 'Failed to parse JSON file. Please ensure it is a valid PettyFlow backup.', 'error');
      }
    };
    reader.readAsText(file);
    importFileInput.value = '';
  });

  // Clear demo records
  function clearDemoData() {
    openConfirmModal(
      'Clear Sample Demonstration Records',
      'This will remove all pre-loaded sample records. Any expenses you personally recorded will be kept.',
      () => {
        state.transactions = state.transactions.filter(t => !t.isSample);
        state.persistTransactions();
        showToast('Sample Data Cleared', 'Sample demonstration records removed.', 'info');
        renderDashboard();
        renderTransactionsTable();
        renderReimbursementsView();
        document.getElementById('sampleDataBanner').style.display = 'none';
        document.getElementById('restoreSampleDataBtn').style.display = 'inline-block';
      }
    );
  }

  clearDemoBtn.addEventListener('click', clearDemoData);
  clearSampleBannerBtn.addEventListener('click', clearDemoData);

  // Restore sample demo data
  restoreSampleBannerBtn.addEventListener('click', () => {
    state.transactions = getInitialSampleTransactions();
    state.persistTransactions();
    showToast('Sample Data Restored', 'Demonstration records restored.', 'success');
    renderDashboard();
    renderTransactionsTable();
    renderReimbursementsView();
    document.getElementById('restoreSampleDataBtn').style.display = 'none';
  });

  // Factory reset application
  resetAllBtn.addEventListener('click', () => {
    openConfirmModal(
      'Factory Reset PettyFlow',
      'WARNING: This will permanently delete ALL transactions, receipts, and user settings from this browser.',
      async () => {
        localStorage.removeItem('pettyflow_settings');
        localStorage.removeItem('pettyflow_transactions');
        await attachmentStore.clearAll();
        state.settings = { ...SAMPLE_SETTINGS };
        state.transactions = [];
        state.persistTransactions();
        updateUserProfileDisplays();
        renderDashboard();
        renderTransactionsTable();
        renderSettingsView();
        showToast('App Reset', 'PettyFlow reset to clean state.', 'info');
      }
    );
  });
}

function renderSettingsView() {
  document.getElementById('settingCompanyName').value = state.settings.companyName;
  document.getElementById('settingEmployeeName').value = state.settings.employeeName;
  document.getElementById('settingEmployeeRole').value = state.settings.employeeRole;
}

function updateUserProfileDisplays() {
  document.getElementById('sidebarUserName').textContent = state.settings.employeeName;
  document.getElementById('sidebarUserRole').textContent = state.settings.employeeRole;
  
  // User initials avatar
  const initials = state.settings.employeeName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  document.getElementById('sidebarAvatar').textContent = initials || 'SP';
}

// =============================================================================
// 12. Modal & Transaction Details System
// =============================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

function initModals() {
  // Close modal when clicking on backdrop
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // Lightbox close buttons
  document.getElementById('closeLightboxBtn').addEventListener('click', () => closeModal('receiptLightboxModal'));
  document.getElementById('lightboxCloseBtn').addEventListener('click', () => closeModal('receiptLightboxModal'));

  // Transaction details close buttons
  document.getElementById('closeTxDetailModalBtn').addEventListener('click', () => closeModal('txDetailsModal'));
  document.getElementById('modalCloseActionBtn').addEventListener('click', () => closeModal('txDetailsModal'));

  // Confirmation modal close buttons
  document.getElementById('closeConfirmModalBtn').addEventListener('click', () => closeModal('confirmModal'));
  document.getElementById('confirmModalCancelBtn').addEventListener('click', () => closeModal('confirmModal'));
}

function openConfirmModal(title, message, onConfirmCallback) {
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalMessage').textContent = message;
  const confirmBtn = document.getElementById('confirmModalConfirmBtn');

  // Replace button clone to clean existing listeners
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener('click', () => {
    closeModal('confirmModal');
    if (typeof onConfirmCallback === 'function') onConfirmCallback();
  });

  openModal('confirmModal');
}

function openTransactionDetailsModal(txId) {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;

  document.getElementById('modalDetailExpenseId').textContent = tx.id;
  document.getElementById('modalDetailTitle').textContent = tx.title;

  const body = document.getElementById('modalDetailBody');
  const badgeClass = getBadgeClass(tx.reimbursementStatus);

  let attachmentsHtml = '';
  if (tx.attachments && tx.attachments.length > 0) {
    attachmentsHtml = `
      <div style="margin-top: 1.25rem;">
        <h4 style="font-size:0.85rem; font-weight:700; margin-bottom:0.75rem;">Attached Receipts & Proof (${tx.attachments.length})</h4>
        <div class="attachment-preview-grid">
          ${tx.attachments.map((att, i) => `
            <div class="attachment-preview-card" style="cursor:pointer;" onclick="openReceiptByIndex('${tx.id}', ${i})">
              <div class="attachment-thumb" style="${att.isPdf ? '' : `background-image: url('${att.dataUrl}');`}">
                ${att.isPdf ? '<div class="attachment-pdf-icon"><i data-lucide="file-text"></i><span>PDF</span></div>' : ''}
              </div>
              <div class="attachment-info-bar">${escapeHtml(att.name)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    attachmentsHtml = `
      <div style="margin-top:1.25rem; padding:0.75rem; background:#f8fafc; border-radius:8px; font-size:0.8rem; color:#94a3b8;">
        No receipt image or PDF uploaded for this transaction.
      </div>
    `;
  }

  // History timeline HTML
  let historyHtml = '';
  if (tx.reimbursementHistory && tx.reimbursementHistory.length > 0) {
    historyHtml = `
      <div style="margin-top:1.25rem;">
        <h4 style="font-size:0.85rem; font-weight:700; margin-bottom:0.5rem;">Audit & Status Progression History</h4>
        <ul style="font-size:0.78rem; color:#475569; display:flex; flex-direction:column; gap:0.35rem;">
          ${tx.reimbursementHistory.map(h => `
            <li style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:0.25rem;">
              <span><strong>${formatDate(h.date)}</strong> - ${escapeHtml(h.status)}: ${escapeHtml(h.note || '')}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; border-bottom:1px solid #f1f5f9; padding-bottom:1rem;">
      <div>
        <div style="font-size:1.8rem; font-weight:800; color:#0f172a;" class="tabular-nums">${formatCurrency(tx.amount)}</div>
        <div style="font-size:0.8rem; color:#64748b;">Recorded on ${formatDate(tx.date)} at ${tx.time || '10:00 AM'}</div>
      </div>
      <div>
        <span class="status-badge ${badgeClass}" style="font-size:0.85rem; padding:0.35rem 0.85rem;">
          <span class="badge-circle"></span>
          <span>${escapeHtml(tx.reimbursementStatus)}</span>
        </span>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; font-size:0.85rem;">
      <div class="preview-item-row"><span class="preview-item-label">Category:</span><span class="preview-item-value">${escapeHtml(tx.category)}</span></div>
      <div class="preview-item-row"><span class="preview-item-label">Vendor:</span><span class="preview-item-value">${escapeHtml(tx.vendor)}</span></div>
      <div class="preview-item-row"><span class="preview-item-label">Payment Method:</span><span class="preview-item-value">${escapeHtml(tx.paymentMethod)}</span></div>
      <div class="preview-item-row"><span class="preview-item-label">Paid By:</span><span class="preview-item-value">${escapeHtml(tx.paidBy)}</span></div>
      ${tx.transportProvider && tx.transportProvider !== 'Other' ? `<div class="preview-item-row"><span class="preview-item-label">Transport Provider:</span><span class="preview-item-value">${escapeHtml(tx.transportProvider)}</span></div>` : ''}
      <div class="preview-item-row"><span class="preview-item-label">Expense Nature:</span><span class="preview-item-value">${tx.paymentMethod === 'Company Cash' ? 'Direct Company Float' : 'Personal Out-of-Pocket'}</span></div>
    </div>

    <div style="margin-top:1.25rem; font-size:0.85rem;">
      <h4 style="font-size:0.85rem; font-weight:700; margin-bottom:0.25rem;">Business Purpose / Description</h4>
      <p style="background:#f8fafc; padding:0.75rem; border-radius:6px; color:#334155;">${escapeHtml(tx.description || 'None provided')}</p>
    </div>

    ${tx.notes ? `
      <div style="margin-top:0.75rem; font-size:0.85rem;">
        <h4 style="font-size:0.85rem; font-weight:700; margin-bottom:0.25rem;">Notes / References</h4>
        <p style="background:#f8fafc; padding:0.75rem; border-radius:6px; color:#334155;">${escapeHtml(tx.notes)}</p>
      </div>
    ` : ''}

    ${attachmentsHtml}
    ${historyHtml}
  `;

  // Edit / Delete button handlers inside modal
  const editBtn = document.getElementById('modalEditBtn');
  editBtn.onclick = () => {
    closeModal('txDetailsModal');
    populateFormForEdit(tx.id);
  };

  const deleteBtn = document.getElementById('modalDeleteBtn');
  deleteBtn.onclick = () => {
    closeModal('txDetailsModal');
    confirmDeleteTransaction(tx.id);
  };

  const printSlipBtn = document.getElementById('modalPrintSlipBtn');
  printSlipBtn.onclick = () => {
    printSingleExpenseSlip(tx);
  };

  openModal('txDetailsModal');
  if (window.lucide) window.lucide.createIcons();
}

window.openReceiptByIndex = function(txId, index) {
  const tx = state.transactions.find(t => t.id === txId);
  if (tx && tx.attachments && tx.attachments[index]) {
    openReceiptLightbox(tx.attachments[index]);
  }
};

function printSingleExpenseSlip(tx) {
  printUploadedReceiptsA4(tx.attachments || [], tx);
}

function printUploadedReceiptsA4(specificAttachments = null, txData = null) {
  const attachments = specificAttachments !== null ? specificAttachments : state.stagedAttachments;
  if (!attachments || attachments.length === 0) {
    showToast('No Receipts Attached', 'Please upload or attach at least one receipt image to print on A4.', 'warning');
    return;
  }

  const imageAttachments = attachments.filter(a => !a.isPdf && a.dataUrl);
  if (imageAttachments.length === 0) {
    showToast('No Receipt Images', 'Please attach JPG, PNG, or WebP receipt images to print on A4.', 'warning');
    return;
  }

  const printWindow = window.open('', '_blank', 'width=950,height=900');
  if (!printWindow) {
    showToast('Print Notice', 'Please allow popups in your browser to open the A4 print sheet.', 'warning');
    return;
  }

  const imgCount = imageAttachments.length;
  let gridClass = 'count-1';
  if (imgCount === 2) gridClass = 'count-2';
  else if (imgCount === 3) gridClass = 'count-3';
  else if (imgCount === 4) gridClass = 'count-4';
  else if (imgCount > 4) gridClass = 'count-multi';

  const imagesHtml = `
    <div class="receipts-grid ${gridClass}">
      ${imageAttachments.map(img => `
        <div class="receipt-frame">
          <img src="${img.dataUrl}" alt="Receipt" />
        </div>
      `).join('')}
    </div>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Receipts</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html, body {
          width: 100%;
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print-toolbar {
          background: #0f172a;
          color: #ffffff;
          padding: 10px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 9999;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
        }
        .no-print-toolbar button {
          background: #2563eb;
          color: #fff;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
        }
        .no-print-toolbar button:hover {
          background: #1d4ed8;
        }

        .a4-container {
          width: 100%;
          max-width: 194mm;
          margin: 0 auto;
          padding: 4mm 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 65px);
        }

        .receipts-grid {
          width: 100%;
        }

        /* 1 Image: Full A4 Fit */
        .receipts-grid.count-1 {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }
        .receipts-grid.count-1 .receipt-frame {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .receipts-grid.count-1 img {
          max-width: 100%;
          max-height: 265mm;
          object-fit: contain;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }

        /* 2 Images: Side-by-Side (Ideal for Mobile Receipts & Proof Screenshots) */
        .receipts-grid.count-2 {
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: center;
          gap: 8mm;
          width: 100%;
        }
        .receipts-grid.count-2 .receipt-frame {
          flex: 1;
          max-width: 93mm;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .receipts-grid.count-2 img {
          max-width: 100%;
          max-height: 265mm;
          object-fit: contain;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }

        /* 3 or 4 Images: 2x2 Grid */
        .receipts-grid.count-3,
        .receipts-grid.count-4 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6mm;
          width: 100%;
          justify-items: center;
          align-items: center;
        }
        .receipts-grid.count-3 .receipt-frame,
        .receipts-grid.count-4 .receipt-frame {
          width: 100%;
          max-width: 93mm;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .receipts-grid.count-3 img,
        .receipts-grid.count-4 img {
          max-width: 100%;
          max-height: 128mm;
          object-fit: contain;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }

        /* Multi (5+) Images */
        .receipts-grid.count-multi {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6mm;
          width: 100%;
        }
        .receipts-grid.count-multi .receipt-frame {
          display: flex;
          justify-content: center;
          align-items: center;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .receipts-grid.count-multi img {
          max-width: 100%;
          max-height: 125mm;
          object-fit: contain;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }

        @media print {
          .no-print-toolbar {
            display: none !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          .a4-container {
            max-width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .receipts-grid {
            height: auto !important;
            min-height: 0 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-toolbar">
        <div><strong>PettyFlow A4 Print Preview</strong> &mdash; Receipts Only</div>
        <button onclick="window.print();">🖨️ Print Now (A4)</button>
      </div>

      <div class="a4-container">
        ${imagesHtml}
      </div>

      <script>
        window.addEventListener('load', function() {
          const imgs = Array.from(document.images);
          Promise.all(imgs.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          })).then(() => {
            setTimeout(() => {
              window.print();
            }, 300);
          });
        });
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// =============================================================================
// 13. CSV Export Helper & Toast Notifications
// =============================================================================
function exportToCsv(dataList, filename = 'PettyFlow_Export.csv') {
  if (!dataList || dataList.length === 0) {
    showToast('Export Error', 'No records available to export.', 'warning');
    return;
  }

  const headers = [
    'Expense ID',
    'Date',
    'Title',
    'Category',
    'Vendor',
    'Transport Provider',
    'Amount (LKR)',
    'Payment Method',
    'Paid By',
    'Reimbursement Status',
    'Receipt Count',
    'Description',
    'Notes'
  ];

  const rows = dataList.map(tx => [
    `"${(tx.id || '').replace(/"/g, '""')}"`,
    `"${tx.date || ''}"`,
    `"${(tx.title || '').replace(/"/g, '""')}"`,
    `"${(tx.category || '').replace(/"/g, '""')}"`,
    `"${(tx.vendor || '').replace(/"/g, '""')}"`,
    `"${(tx.transportProvider || '').replace(/"/g, '""')}"`,
    Number(tx.amount || 0).toFixed(2),
    `"${(tx.paymentMethod || '').replace(/"/g, '""')}"`,
    `"${(tx.paidBy || '').replace(/"/g, '""')}"`,
    `"${(tx.reimbursementStatus || '').replace(/"/g, '""')}"`,
    tx.attachments ? tx.attachments.length : 0,
    `"${(tx.description || '').replace(/"/g, '""')}"`,
    `"${(tx.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('CSV Exported', `Successfully downloaded ${dataList.length} records.`, 'success');
}

function showToast(title, message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconName = {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info'
  }[type] || 'info';

  toast.innerHTML = `
    <div class="toast-icon"><i data-lucide="${iconName}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Chart Period Switchers
function initChartPeriodPills() {
  document.querySelectorAll('#chartPeriodPills .btn-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#chartPeriodPills .btn-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedTrendPeriod = btn.dataset.period;
      renderTrendChart();
    });
  });
}

// =============================================================================
// 14. Application Initialization on DOMContentLoaded
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Controllers
  initNavigation();
  initExpenseForm();
  initReceiptUpload();
  initTransactionsView();
  initReimbursementsView();
  initReportsView();
  initSettingsView();
  initModals();
  initChartPeriodPills();

  // Initial user profile render
  updateUserProfileDisplays();

  // Initial dashboard render
  renderDashboard();

  // Initial Lucide icons scan
  if (window.lucide) {
    window.lucide.createIcons();
  }
});
