# SANJEEVANI — Intelligent Last-Mile Aid Coordination Platform

> **Smart Aid. Safer Deliveries.**  
> Built for **VIBE-A-THON 2026** | Domain: *Social Impact & Civic Micro-Logistics*  
> **Problem Statement:** "The Last-Mile Spoilage Trap: Coordinating Perishable Surplus & Fragile Aid Under Uncertainty"

---

## 1. Problem Overview

In metropolitan cities and urban emergency relief operations (floods, civic displacement), nearly **40% of perishable aid and medical surplus is wasted or causes harm on the ground** due to structural coordination blind spots:

1. **Supply-Demand Asymmetry:** A banquet hall produces 180 cooked meals expiring in 75 minutes, but a volunteer scooter rider can only carry 40 meals, and nearby shelters only need 30–50 meals each.
2. **Volunteer "Ghost Reservations":** A volunteer claims a batch on their app, gets stalled or unresponsive for 30 minutes, and by the time the reservation lapses, remaining safe shelf-life is too short for anyone else to deliver.
3. **Mid-Transit Demand Evaporation:** While a rider is halfway to a shelter with 40 meals, an offline local drop-off fills that shelter to capacity, stranding the incoming rider with ticking perishable cargo.
4. **Dangerous Aid Dependencies:** Dispatching raw ration kits or infant formula to sites lacking potable water or cooking fuel causes health crises and unusable aid.

**Sanjeevani** solves this by treating **time, carrying capacity, infrastructure prerequisites, and human unreliability as dynamic runtime variables**.

---

## 2. Core Architectural Pillars

- **Atomic Knapsack Batch Splitting:** Decomposes bulk surplus (e.g. 180 meals) into discrete sub-shipments ($s_i \le \min(C_{\text{rider}}, \text{Demand}_j)$) and coordinates simultaneous multi-rider rendezvous dispatches.
- **Dynamic Adaptive Claim TTL & Dead-Man Watchdog:** Claim locks scale with remaining shelf life ($\tau = \min(30\text{s}, 0.15 \times T_{\text{residual}})$ in accelerated demo). Stalled riders trigger automated reclaim and re-assignment to standby riders.
- **Active Telemetry Diverter:** Dynamically intercepts in-transit riders when a destination closes or fills, finding alternative open shelters within safe travel margins ($\text{ETA} + T_{\text{buffer}} \le T_{\text{expiry}}$).
- **Hard Prerequisite Compatibility Matrix:** Rejects infant formula if a facility lacks potable water, blocks raw rations if a site lacks cooking fuel, and blocks cold-chain medicine if refrigeration is absent.

---

## 3. Technology Stack

- **Frontend:** React 18 with TypeScript & Vite
- **Styling:** Tailwind CSS (Civic-tech palette: Forest Green, Teal, Saffron, and Signal Red)
- **Mapping:** React Leaflet with OpenStreetMap Voyager tiles & live vector overlays
- **State & Persistence:** Deterministic React State with `localStorage` persistence and 1-click fresh baseline restoration
- **Icons:** Lucide React

---

## 4. Getting Started & Running Locally

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Launch
```bash
# 1. Navigate to the project directory
cd sanjeevani

# 2. Install dependencies (if not already installed)
npm install

# 3. Run development server
npm run dev

# 4. Or build production bundle
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. The 4 Mandatory Demo Scenarios (Judge Verification Checklist)

Navigate to the **Demo Control Center** tab or trigger scenarios via 1-click buttons:

| Scenario | Objective & Simulated Trigger | System Response & Output | Status |
| :--- | :--- | :--- | :--- |
| **Scenario A: Expiry Crisis** | 180 meals expiring in 75 mins with 40-capacity riders. | Engine decomposes 180 meals into `40 + 40 + 40 + 40 + 20` across 5 riders without loss. | **PASSED** |
| **Scenario B: Ghost Reservation** | Volunteer Rajesh claims 40 meals and goes dark. | 30s accelerated dead-man watchdog detects stall, breaks lock, reclaims 40 meals, and hands over to standby rider Priya Sharma. | **PASSED** |
| **Scenario C: Shelter Closure Mid-Transit** | Rajesh is in transit with 40 meals; Shelter Alpha filled by local offline donor. | Conflict detected immediately; active diverter reroutes in-flight rider to Shelter Beta (+4 mins ETA, safe within shelf-life). | **PASSED** |
| **Scenario D: Unsafe Aid Dependency** | Attempt to send infant formula to camp without clean water, or raw rations without kitchen stoves. | Policy validator intercepts missing prerequisites and blocks dispatch with an explicit, explainable audit message. | **PASSED** |

---

## 6. Project Structure

```
sanjeevani/
├── public/
│   └── logo.svg                 # Custom SVG brand logo (leaf, heart, route pin)
├── src/
│   ├── components/
│   │   ├── InteractiveMap.tsx   # Leaflet Map with live fleet & route vectors
│   │   ├── Navbar.tsx           # Header with speed controls & simulation badge
│   │   └── Sidebar.tsx          # Navigation sidebar with dynamic status badges
│   ├── context/
│   │   └── AppContext.tsx       # Global reactive state, watchdog, & scenarios
│   ├── data/
│   │   └── initialData.ts       # Seeded donors, shelters, and fleet profiles
│   ├── utils/
│   │   ├── engine.ts            # Scoring, feasibility inequalities, & knapsack
│   │   └── geo.ts               # Haversine distance & urban transit ETA models
│   ├── views/
│   │   ├── DashboardView.tsx    # Live KPIs, radar map, & urgency queue
│   │   ├── DonationsView.tsx    # Batch ingestion & shelf-life countdown
│   │   ├── DispatchCenterView.tsx # Multi-variable explainable dispatch engine
│   │   ├── VolunteersView.tsx   # Fleet monitoring & ghost simulation
│   │   ├── SheltersView.tsx     # Destination registry & capacity toggles
│   │   ├── LiveOperationsView.tsx # Chronological audit log with JSON export
│   │   └── DemoControlCenterView.tsx # 1-click Judge Test Harness
│   ├── types.ts                 # Full TypeScript definitions & interfaces
│   ├── App.tsx                  # Main app layout shell
│   ├── main.tsx                 # Entrypoint
│   └── index.css                # Tailwind base styles & animations
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 7. Assumptions & Known Limitations

- **Simulated Telemetry:** Telemetry heartbeats and locations use calibrated coordinates around central urban zones. The system explicitly identifies all mock data with a visible `DEMO SIMULATION` pill.
- **Time Acceleration:** Real-world ghost reservation check-ins typically take 15–30 minutes; in this demo environment, timers are accelerated to 30 seconds (with 1x/5x/10x toggles) so judges can observe full lifecycles within 3 minutes.
- **Offline Reliability:** OpenStreetMap Voyager tiles are loaded via CDN; if running completely air-gapped without internet, the interactive map graceful fallback maintains full UI functionality.
