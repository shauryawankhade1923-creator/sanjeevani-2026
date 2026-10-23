import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  PlayCircle, 
  RotateCcw, 
  Flame, 
  UserX, 
  Home, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight,
  Layers,
  Sparkles,
  Clock,
  Send,
  HelpCircle,
  Zap
} from 'lucide-react';

export const DemoControlCenterView: React.FC = () => {
  const { 
    runScenarioA, 
    runScenarioB, 
    runScenarioC, 
    runScenarioD, 
    resetAllData,
    activeScenario,
    scenarioStep,
    scenarioNotes,
    setActiveTab,
    tasks,
    donations
  } = useApp();

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-10">
      
      {/* Top Banner */}
      <div className="bg-[#111614] rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-[#1E2522] flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <div className="inline-flex items-center space-x-1.5 bg-[#E5F940]/20 text-[#E5F940] text-xs font-bold px-3 py-1 rounded-full mb-2 border border-[#E5F940]/30 font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Loops House AI & Judge Verification Rig</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Demo Control Center & Failure Simulations
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Execute each of the four mandatory failure simulations with 1-click repeatable automation. Every scenario runs live in memory with deterministic state transitions.
          </p>
        </div>

        <button
          onClick={resetAllData}
          className="self-start md:self-auto inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold px-5 py-2.5 rounded-full border border-white/20 transition shadow-xs"
        >
          <RotateCcw className="w-4 h-4 text-slate-300" />
          <span>Reset Fresh Baseline</span>
        </button>
      </div>

      {/* Active Scenario Live Progression Bar */}
      {activeScenario !== 'NONE' && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#0C382E]/30 p-5 shadow-xs ring-1 ring-[#0C382E]/10 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-3 h-3 rounded-full bg-[#E5F940] border-2 border-slate-900 animate-ping" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 font-mono">
                {activeScenario.replace('_', ' ')}: Running Step {scenarioStep}
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('events')}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center space-x-1"
            >
              <span>View Audit Stream</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-800 bg-[#E8EFE9] p-3 rounded-2xl border border-slate-200/80 font-mono font-medium">
            {scenarioNotes}
          </p>
        </div>
      )}

      {/* The 4 Mandatory Scenarios Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        
        {/* Scenario A: Expiry Crisis & Batch Splitting */}
        <div className={`bg-white/95 backdrop-blur-md rounded-3xl border p-6 shadow-xs transition flex flex-col justify-between ${
          activeScenario === 'SCENARIO_A' ? 'border-[#E5F940] ring-2 ring-[#E5F940]/40' : 'border-slate-200/90 hover:border-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="bg-[#E5F940] text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                Scenario A
              </span>
              <span className="text-xs text-slate-400 font-mono">Problem 1: Bulk Expiry</span>
            </div>

            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-600" />
              <span>180-Meal Expiry Crisis & Multi-Rider Splitting</span>
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              <strong>Simulated Trigger:</strong> Banquet hall registers 180 cooked meals expiring in 75 minutes. A single volunteer rider can only carry 40 meals.
            </p>

            <div className="mt-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-1.5 font-mono text-[11px]">
              <div>&bull; Ingests 180 meals @ 75m safe shelf-life</div>
              <div>&bull; Calculates fleet knapsack split: 40 + 40 + 20 (Alpha) + 40 + 40 (Beta)</div>
              <div>&bull; Allocates 5 distinct riders simultaneously</div>
              <div>&bull; Guarantees zero double-counting or dropped units</div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={runScenarioA}
              className="inline-flex items-center space-x-2 bg-[#E5F940] hover:bg-[#d9ec34] text-slate-950 text-xs font-black px-5 py-2.5 rounded-full shadow-xs transition"
            >
              <PlayCircle className="w-4 h-4 text-slate-900" />
              <span>Run Scenario A</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono">1-Click Live Test</span>
          </div>
        </div>

        {/* Scenario B: Ghost Reservation */}
        <div className={`bg-white/95 backdrop-blur-md rounded-3xl border p-6 shadow-xs transition flex flex-col justify-between ${
          activeScenario === 'SCENARIO_B' ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-200/90 hover:border-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="bg-red-100 text-red-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                Scenario B
              </span>
              <span className="text-xs text-slate-400 font-mono">Problem 2: Volunteer Stalls</span>
            </div>

            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <UserX className="w-4 h-4 text-red-600" />
              <span>Ghost Reservation Reclaim & Auto-Reassignment</span>
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              <strong>Simulated Trigger:</strong> Volunteer claims a 40-meal batch but stops transmitting heartbeats. Accelerated dead-man watchdog detects stall.
            </p>

            <div className="mt-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-1.5 font-mono text-[11px]">
              <div>&bull; Locks 40 meals with dynamic 30s claim TTL</div>
              <div>&bull; Simulates unresponsive volunteer telemetry</div>
              <div>&bull; Breaks lock upon deadline expiration</div>
              <div>&bull; Reclaims 40 units & hands over to standby rider</div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={runScenarioB}
              className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-xs transition"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Run Scenario B</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono">Accelerated 30s Watchdog</span>
          </div>
        </div>

        {/* Scenario C: Shelter Closure Mid-Delivery */}
        <div className={`bg-white/95 backdrop-blur-md rounded-3xl border p-6 shadow-xs transition flex flex-col justify-between ${
          activeScenario === 'SCENARIO_C' ? 'border-sky-400 ring-2 ring-sky-200' : 'border-slate-200/90 hover:border-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                Scenario C
              </span>
              <span className="text-xs text-slate-400 font-mono">Problem 3: Ground Fluctuation</span>
            </div>

            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Home className="w-4 h-4 text-sky-600" />
              <span>Mid-Transit Dynamic Rerouting on Capacity Closure</span>
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              <strong>Simulated Trigger:</strong> While a rider is transporting 40 meals to Shelter Alpha, an offline local drop-off fills Shelter Alpha to 100%.
            </p>

            <div className="mt-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-1.5 font-mono text-[11px]">
              <div>&bull; Rider is confirmed in transit with 40 meals</div>
              <div>&bull; Shelter Alpha capacity drops to 0 available</div>
              <div>&bull; Telemetry diverter computes alternative destination</div>
              <div>&bull; Reroutes to Shelter Beta (+4m ETA, safe within expiry)</div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={runScenarioC}
              className="inline-flex items-center space-x-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-xs transition"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Run Scenario C</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono">Dynamic Path Diverter</span>
          </div>
        </div>

        {/* Scenario D: Unsafe Aid Dependency */}
        <div className={`bg-white/95 backdrop-blur-md rounded-3xl border p-6 shadow-xs transition flex flex-col justify-between ${
          activeScenario === 'SCENARIO_D' ? 'border-purple-400 ring-2 ring-purple-200' : 'border-slate-200/90 hover:border-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                Scenario D
              </span>
              <span className="text-xs text-slate-400 font-mono">Problem 4: Dangerous Mismatches</span>
            </div>

            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>Prerequisite Validation (Potable Water & Fuel)</span>
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              <strong>Simulated Trigger:</strong> Attempting to dispatch Infant Formula to a camp without clean water, or raw ration kits to a dry dormitory without stoves.
            </p>

            <div className="mt-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-1.5 font-mono text-[11px]">
              <div>&bull; Checks Infant Formula against Shelter Gamma</div>
              <div>&bull; Intercepts missing clean potable water & blocks</div>
              <div>&bull; Checks Raw Ration Kits against Shelter Delta</div>
              <div>&bull; Intercepts missing kitchen/fuel stoves & blocks</div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={runScenarioD}
              className="inline-flex items-center space-x-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-xs transition"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Run Scenario D</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono">Policy Hard Enforcement</span>
          </div>
        </div>

      </div>

      {/* 3-Minute Pitch Walkthrough Script */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center space-x-2">
          <span>Judge Presentation Pitch Sequence (3-Minute Walkthrough)</span>
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 leading-relaxed">
          <li>
            <strong>Opening (30s):</strong> "Nearly 40% of perishable aid is wasted not from supply scarcity, but from coordination blind spots under decay uncertainty. Sanjeevani treats time, capacity, and human stalls as active variables."
          </li>
          <li>
            <strong>Demonstrate Scenario A (45s):</strong> Click <em>Run Scenario A</em>. Show how 180 cooked meals with 75 mins shelf-life are decomposed into discrete 40-capacity sub-shipments across 5 volunteer riders.
          </li>
          <li>
            <strong>Demonstrate Scenario B (45s):</strong> Click <em>Run Scenario B</em>. Show volunteer Rajesh Kumar going dark. Highlight the accelerated 30-second watchdog timer reclaiming the 40 meals and re-dispatching to Priya Sharma.
          </li>
          <li>
            <strong>Demonstrate Scenario C & D (60s):</strong> Click <em>Run Scenario C</em> to show mid-transit rerouting when Shelter Alpha is filled by offline donors, followed by <em>Run Scenario D</em> showing baby formula blocked from reaching camps lacking potable water.
          </li>
        </ol>
      </div>

    </div>
  );
};
