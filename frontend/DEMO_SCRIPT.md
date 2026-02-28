# 2-Minute Interview Demo Script

## System Overview
> *"Welcome to the AI Inventory Management System - a modern, enterprise-grade dashboard built with Vite, React, TypeScript, and Tailwind. The app features role-based access control, AI forecasting, real-time alerts, and audit logging. Let me walk you through the key features."*

---

## Demo Flow (2 minutes)

### [0:00-0:20] Login & Dashboard
1. **Navigate to Dashboard**
   - Point out the PageHeader: "We have a consistent header across all pages with title and description"
   - Show the 4 KPI stat cards: Total Products (1,234), Low Stock (23), Pending Orders (45), Revenue (12.5K)
   - *"Notice the loading skeleton animation - each page simulates realistic data fetching with Skeleton components"*
   - Swipe down to show Recent Activity section
   - **Design Note:** "Blue primary accent, dark mode support, responsive layout"

### [0:20-0:45] STAFF Workflow: Create Purchase via Alerts
2. **Navigate to Alerts Page**
   - Click on "Alerts" in sidebar (left panel)
   - **Show Two Tables:**
     - **Low Stock Items:** Products below threshold (e.g., "MacBook Pro" at 5 units, "Wireless Mouse" at 0)
       - Note the status badges: "LOW" (yellow), "OUT" (red)
       - Filter bar at top with search, module dropdown, date range
     - **AI Reorder Suggestions:** Auto-generated purchase suggestions with confidence scores
       - Each suggestion shows product, supplier, recommended qty, estimated cost
       - Action: Click "Create Draft" button on AI suggestion
   - *"The system analyzes stock levels and suggests optimal reorders with supplier matching"*

3. **Create Purchase from Alert**
   - Click "Create Draft" on an AI suggestion
   - Demonstrates: Auto-population of supplier and items from Alerts
   - *"The purchase draft is immediately saved to localStorage - refresh won't lose work"*

### [0:45-1:15] Create Sale & Print Invoice
4. **Navigate to Sales > New Sale**
   - Click "Sales" → "New Sale" button
   - **Split View Layout:**
     - Left: SaleForm (add items in-line editable table, quantity, unit price auto-calculated)
     - Right: InvoicePreview (live calculation showing subtotal, tax, discount, total)
   - *"Items are instantly reflected in the invoice as you type - real-time preview"*
   - Add a few items, mention discount/tax calculations
   - **Print Feature:** Hover Print button → "This uses a print stylesheet that hides the form and shows invoice-ready layout"
   - Try Ctrl+P (or Cmd+P) to show print preview
   - *"The invoice prints with proper formatting without the UI clutter"*

### [1:15-1:50] Admin Features: Audit Logs & RBAC
5. **Switch User Role to ADMIN**
   - Navigate to Settings
   - Show "Current User" card with STAFF role badge
   - Show "Your Permissions" list (for STAFF, it shows: PRODUCTS_VIEW, SALES_VIEW, ALERTS_VIEW, AI_FORECAST_VIEW, PURCHASES_VIEW)
   - In "Developer Tools" section, click role button for "ADMIN"
   - *"In production, roles come from your auth backend (JWT). We mock them here for demo"*
   - Notice page auto-refreshes, sidebar updates to show new menu items (Users & Roles, Audit Logs, Settings visible now)

6. **Navigate to Audit Logs**
   - Click "Audit Logs" in sidebar (previously hidden for STAFF)
   - **Timeline UI:**
     - Date headers: "Today", "Yesterday", "Feb 27, 2026"
     - Each log entry shows:
       - Action badge: CREATE (green), UPDATE (blue), DELETE (red), LOGIN (purple), LOGOUT (orange)
       - Module pill: Products, Suppliers, Purchases, Sales, Stock, AI
       - Actor info: "John Admin" • ADMIN role badge
       - Timestamp: HH:mm format
       - Description: Human-readable change summary
   - *"We have 30+ audit entries spanning the last week"*
   - **Filter Bar:**
     - Search: "Type to find by entity name, actor, or description"
     - Module dropdown: filter by Products, Suppliers, etc.
     - Action dropdown: filter by CREATE, UPDATE, etc.
     - Date Range: Today / Last 7 Days / Last 30 Days / All Time
     - Clear Filters button resets all
   - **Click "View Details" on an entry:**
     - Modal shows: Action, Module, Timestamp, Severity badge, Actor/Role, Entity Type/Name, Description
     - **Before/After JSON:** For UPDATE actions, shows the state change in formatted code blocks
     - *"Perfect for compliance audits and debugging unexpected changes"*

7. **RBAC Protection Demo**
   - While ADMIN, show access to all sidebar items
   - *"Behind the scenes, every route checks permissions. Let me show the code..."*
   - Navigate back to Settings → developer role switcher
   - Switch back to STAFF
   - Notice sidebar hides "Audit Logs" and "Users & Roles" items immediately
   - Try typing `/audit-logs` in browser URL bar
   - System redirects to `/unauthorized` page with 403 error
   - *"The RequirePermission guard blocks unauthorized access and shows a clear error page"*

### [1:50-2:00] AI Forecast
8. **Navigate to AI Forecast Page**
   - Click "AI Forecast" in sidebar
   - **Show Key Elements:**
     - Product selector (Popover with Command search)
     - 7-day vs 30-day horizon toggle (7-day default)
     - **Recharts ComposedChart:**
       - Blue line: historical data (last 30 days)
       - Green line: forecast trend
       - Light green area: confidence interval band
       - X-axis: dates, Y-axis: quantity
     - **KPI Cards below chart:**
       - Trend: +18% next week
       - Accuracy: 92%
       - Confidence: High (with green badge)
     - **Explanation section:** "Our ML model predicts demand based on historical patterns and seasonality"
   - *"This helps procurement teams plan stock levels and avoid stockouts"*

### [2:00] Wrap-up
> *"That's the core system: inventory management for products/suppliers, purchase/sales workflows, AI-driven insights (alerts + forecasting), complete audit trail, and flexible role-based access control. The UI is responsive, accessible, with zero TypeScript errors. Ready for production or further customization. Questions?"*

---

## Key Features Highlighted

| Feature | Demo Point | Implementation |
|---------|-----------|-----------------|
| **UI Consistency** | All pages use PageHeader + Card + Button styling | Design system via shadcn/ui |
| **Loading States** | Skeleton loaders on each data page | Suspense + Skeleton component |
| **Empty States** | "No Products Found" with CTA button | EmptyState component |
| **RBAC** | Sidebar hides items, routes block access, 403 page | Zustand store + RequirePermission guard |
| **Dark Mode** | Toggle theme in topbar | ThemeProvider + localStorage |
| **Real-time UI** | Invoice updates as you type items | Controlled inputs + React state |
| **Print Functionality** | Ctrl+P shows invoice-ready output | CSS media print rules |
| **Audit Trail** | 30+ entries with before/after JSON | Timeline layout + filter bar |
| **AI Forecasting** | Chart + KPI cards with confidence bands | Recharts + deterministic algorithm |
| **Responsive Design** | Sidebar collapses on mobile | Tailwind responsive classes |

---

## Technical Talking Points (if asked)

- **Build Metrics:** 433 kB main bundle (133 kB gzip), 2989 modules, 2.2s compile
- **Framework:** Vite + React 19 + TypeScript 5.x
- **State Management:** Zustand with localStorage persistence
- **UI Components:** shadcn/ui (30+ components, @radix-ui primitives)
- **Routing:** React Router v7 with lazy-loaded code splitting
- **Charts:** Recharts 3.7
- **Forms:** React Hook Form + Zod validation
- **Accessibility:** WCAG 2.1 AA targeting (focus rings, labels, semantic HTML)
- **Dark Mode:** Native CSS variables via Tailwind config + provider
- **Zero Errors:** TypeScript strict mode, ESLint configured

---

## If Time Allows: Show Code

- **Router:** All routes are `lazy(() => import(...).then(m => ({ default: m.Component })))`
- **Store:** `useAuthStore` persists role to localStorage, dev login method for testing
- **RBAC:** `PERMISSIONS` object with 15+ granular permissions, `hasPermission()` helper
- **HTTP Client:** Centralized `services/http.ts`, reads from `.env.VITE_API_BASE_URL`
