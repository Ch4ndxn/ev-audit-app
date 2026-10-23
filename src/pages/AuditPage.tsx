import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChecklistSection } from '../components/audit/ChecklistSection';
import { PhotoSection } from '../components/audit/PhotoSection';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { Toast } from '../components/ui/Toast';
import { fetchSpocs, fetchVehicles, fetchAuditedVehicleNos, saveAudit, uploadPhoto } from '../lib/db';
import { DEMO_MODE } from '../lib/supabase';
import type {
  AuditFormState, CheckValue, PhotoSlots, SpocGroup, Vehicle,
} from '../types';

const BODY_CHECKS = [
  { id: 'bodyDents',      label: 'Dents / Damage' },
  { id: 'bodyWindscreen', label: 'Windscreen / Glass' },
  { id: 'bodyMirrors',    label: 'Mirrors' },
  { id: 'bodyFrame',      label: 'Frame / Chassis Integrity' },
  { id: 'bodyDoors',      label: 'Doors / Panel Latches' },
  { id: 'bodyTyres',      label: 'Tyre Condition' },
];
const ELEC_CHECKS = [
  { id: 'elecChargerPort', label: 'Charger Port Condition' },
  { id: 'elecWiring',      label: 'Visible Wiring / Connectors' },
  { id: 'elecLights',      label: 'Headlights / Indicators' },
  { id: 'elecDashboard',   label: 'Dashboard / Display' },
  { id: 'elecHorn',        label: 'Horn' },
  { id: 'elecBrake',       label: 'Brake System (Electric)' },
];

const EMPTY_FORM: AuditFormState = {
  spocName: '', city: '', vehicleNo: '', center: '', sm: '', director: '', workingStatus: '',
  bodyDents: '',      bodyDentsRemark: '',
  bodyWindscreen: '', bodyWindscreenRemark: '',
  bodyMirrors: '',    bodyMirrorsRemark: '',
  bodyFrame: '',      bodyFrameRemark: '',
  bodyDoors: '',      bodyDoorsRemark: '',
  bodyTyres: '',      bodyTyresRemark: '',
  elecChargerPort: '', elecChargerPortRemark: '',
  elecWiring: '',      elecWiringRemark: '',
  elecLights: '',      elecLightsRemark: '',
  elecDashboard: '',   elecDashboardRemark: '',
  elecHorn: '',        elecHornRemark: '',
  elecBrake: '',       elecBrakeRemark: '',
  overallCondition: null,
  immediateAction: '',
  actionDetails: '',
  additionalRemarks: '',
};
const EMPTY_SLOTS: PhotoSlots = { chassis: null, front: null, back: null, left: null, right: null, damage: null };

const RATING_META: Record<number, { label: string; cls: string }> = {
  1: { label: 'Critical',  cls: 'bg-red-100 border-red-500 text-red-700' },
  2: { label: 'Poor',      cls: 'bg-amber-100 border-amber-500 text-amber-800' },
  3: { label: 'Fair',      cls: 'bg-orange-100 border-orange-400 text-orange-800' },
  4: { label: 'Good',      cls: 'bg-green-100 border-green-500 text-green-700' },
  5: { label: 'Excellent', cls: 'bg-emerald-100 border-emerald-500 text-emerald-800' },
};

export default function AuditPage() {
  const navigate = useNavigate();

  // ── Data state ─────────────────────────────────────────────
  const [spocGroups,   setSpocGroups]   = useState<SpocGroup[]>([]);
  const [vehicles,     setVehicles]     = useState<Vehicle[]>([]);
  const [auditedSet,   setAuditedSet]   = useState<Set<string>>(new Set());
  const [loading,      setLoading]      = useState(true);
  const [loadErr,      setLoadErr]      = useState('');

  // ── UI state ───────────────────────────────────────────────
  const [step,         setStep]         = useState<1 | 2>(1);  // 1 = SPOC select, 2 = form
  const [selectedSpoc, setSelectedSpoc] = useState<SpocGroup | null>(null);
  const [form,         setForm]         = useState<AuditFormState>(EMPTY_FORM);
  const [photos,       setPhotos]       = useState<PhotoSlots>(EMPTY_SLOTS);
  const [missingPhotos,setMissingPhotos]= useState<string[]>([]);
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState({ visible: false, msg: '' });
  const [progress,     setProgress]     = useState(1);

  function showToast(msg: string) { setToast({ visible: true, msg }); }

  // ── Load data ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [s, v, a] = await Promise.all([fetchSpocs(), fetchVehicles(), fetchAuditedVehicleNos()]);
        setSpocGroups(s);
        setVehicles(v);
        setAuditedSet(a);
      } catch (e) {
        setLoadErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Derived data ───────────────────────────────────────────
  const cityOptions = selectedSpoc
    ? selectedSpoc.cities.map(c => ({ value: c, label: c }))
    : [];

  const vehiclesInCity = form.city
    ? vehicles
        .filter(v => v.city === form.city)
        .sort((a, b) => {
          const aD = auditedSet.has(a.vehicle_no) ? 1 : 0;
          const bD = auditedSet.has(b.vehicle_no) ? 1 : 0;
          return aD - bD || a.vehicle_no.localeCompare(b.vehicle_no);
        })
    : [];

  const vehicleOptions = vehiclesInCity.map(v => ({
    value: v.vehicle_no,
    label: (auditedSet.has(v.vehicle_no) ? '✓ ' : '○ ') + v.vehicle_no +
           (v.status && v.status !== 'Working' ? ` [${v.status}]` : ''),
    done: auditedSet.has(v.vehicle_no),
  }));

  const pendingCount   = vehiclesInCity.filter(v => !auditedSet.has(v.vehicle_no)).length;
  const vehicleSummary = form.city ? `${pendingCount} pending / ${vehiclesInCity.length} total` : undefined;
  const selectedVehicle = vehicles.find(v => v.vehicle_no === form.vehicleNo) || null;
  const isDuplicate     = form.vehicleNo ? auditedSet.has(form.vehicleNo) : false;

  // ── Handlers ───────────────────────────────────────────────
  const setField = useCallback(<K extends keyof AuditFormState>(k: K, v: AuditFormState[K]) => {
    setForm(f => ({ ...f, [k]: v }));
  }, []);

  const setCheckValue = useCallback((id: string, val: CheckValue) => {
    setForm(f => ({ ...f, [id]: val }));
  }, []);

  const setCheckRemark = useCallback((id: string, val: string) => {
    setForm(f => ({ ...f, [`${id}Remark`]: val }));
  }, []);

  const bodyValues  = Object.fromEntries(BODY_CHECKS.map(c => [c.id, form[c.id as keyof AuditFormState] as CheckValue]));
  const bodyRemarks = Object.fromEntries(BODY_CHECKS.map(c => [c.id, form[`${c.id}Remark` as keyof AuditFormState] as string]));
  const elecValues  = Object.fromEntries(ELEC_CHECKS.map(c => [c.id, form[c.id as keyof AuditFormState] as CheckValue]));
  const elecRemarks = Object.fromEntries(ELEC_CHECKS.map(c => [c.id, form[`${c.id}Remark` as keyof AuditFormState] as string]));

  function reset() {
    setForm({ ...EMPTY_FORM, spocName: form.spocName });
    setPhotos(EMPTY_SLOTS);
    setMissingPhotos([]);
    setProgress(2);
  }

  async function handleSubmit() {
    if (!form.city)      { showToast('⚠️ Select a city');    return; }
    if (!form.vehicleNo) { showToast('⚠️ Select a vehicle'); return; }
    if (!form.overallCondition) { showToast('⚠️ Select condition rating'); return; }
    if (!form.immediateAction)  { showToast('⚠️ Select action required status'); return; }

    const missing = (['chassis','front','back','left','right'] as const).filter(a => photos[a] === null);
    if (missing.length) {
      setMissingPhotos(missing);
      showToast('⚠️ Add chassis number + all 4 angle photos');
      return;
    }
    setMissingPhotos([]);

    setSubmitting(true);
    setProgress(4);

    // Upload photos
    const photoUrls: Record<string, string> = {};
    const angles = ['chassis','front','back','left','right','damage'] as const;
    for (const angle of angles) {
      const slot = photos[angle];
      if (!slot) continue;
      try {
        slot.status = 'uploading';
        setPhotos(p => ({ ...p }));
        showToast(`📤 Uploading ${angle} photo…`);
        const url = await uploadPhoto(
          slot.base64, slot.mimeType,
          `audit_${form.vehicleNo}_${angle}_${Date.now()}.jpg`,
          form.city, form.vehicleNo,
        );
        photoUrls[angle] = url;
        slot.status = 'done'; slot.publicUrl = url;
        setPhotos(p => ({ ...p }));
      } catch {
        slot.status = 'error';
        setPhotos(p => ({ ...p }));
      }
    }

    showToast('⏳ Saving audit…');
    try {
      await saveAudit(form, photoUrls, isDuplicate);
      setAuditedSet(prev => new Set([...prev, form.vehicleNo]));
      showToast(isDuplicate
        ? '✅ Saved (duplicate — vehicle already audited)'
        : '✅ Audit saved successfully!');
      setTimeout(reset, 2500);
    } catch (e) {
      showToast('❌ ' + (e as Error).message);
      setProgress(2);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render helpers ─────────────────────────────────────────
  const progressSteps = [1, 2, 3, 4];

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-3 border-blue-100 border-t-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading fleet data…</p>
      </div>
    </div>
  );

  if (loadErr) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 text-center max-w-sm shadow">
        <p className="text-red-600 font-bold mb-1">Failed to load data</p>
        <p className="text-xs text-gray-500">{loadErr}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-[560px] mx-auto min-h-screen flex flex-col bg-gray-100">

      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-[#0d3d82] to-[#1a6be8] text-white px-4 py-3.5 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">🔍</div>
          <div>
            <div className="font-bold text-[15px]">Vehicle Condition Audit</div>
            <div className="text-[11px] opacity-75">EV Fleet — 3W L3 · Delhivery</div>
          </div>
          <button
            className="ml-auto text-[11px] bg-white/20 px-3 py-1.5 rounded-lg font-semibold"
            onClick={() => navigate('/dashboard')}
          >📊 Dashboard</button>
        </div>
        {/* Progress */}
        <div className="flex gap-1.5 mt-2.5">
          {progressSteps.map(s => (
            <div key={s} className={`flex-1 h-[3px] rounded-full transition-all duration-300
              ${s < progress ? 'bg-white/70' : s === progress ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
      </div>

      {DEMO_MODE && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-700 text-center font-medium">
          🧪 Demo mode — data is not saved. Add Supabase env vars to connect.
        </div>
      )}

      <div className="flex-1 px-3.5 pb-24 overflow-y-auto">

        {/* STEP 1: SPOC SELECT */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-4 text-center">
            <div className="text-5xl mb-3">👤</div>
            <h2 className="text-lg font-bold mb-1">Identify Yourself</h2>
            <p className="text-[13px] text-gray-500 mb-5">Select your name to begin the audit session</p>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 text-left">
              Your Name (SPOC)
            </label>
            <select
              className="w-full border-[1.5px] border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white appearance-none focus:outline-none focus:border-blue-500 mb-4"
              onChange={e => {
                const grp = spocGroups.find(g => g.spoc === e.target.value);
                if (grp) {
                  setSelectedSpoc(grp);
                  setForm(f => ({ ...f, spocName: grp.spoc }));
                  setStep(2);
                  setProgress(2);
                }
              }}
            >
              <option value="">— Select SPOC —</option>
              {spocGroups.map(g => <option key={g.spoc} value={g.spoc}>{g.spoc}</option>)}
            </select>
            <p className="text-[11px] text-gray-400">Not listed? Ask admin to add you to the SPOC list.</p>
          </div>
        )}

        {/* STEP 2: MAIN FORM */}
        {step === 2 && selectedSpoc && (
          <>
            {/* SPOC identity card */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl px-3.5 py-3 mt-4 mb-1">
              <div className="w-11 h-11 rounded-full bg-brand flex items-center justify-center text-white text-lg font-black flex-shrink-0">
                {selectedSpoc.spoc[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14px]">{selectedSpoc.spoc}</div>
                <div className="text-[11px] text-blue-700 truncate">📍 {selectedSpoc.cities.join(' · ')}</div>
              </div>
              <button
                className="text-[11px] text-brand font-bold bg-white border border-blue-200 rounded-lg px-2.5 py-1 flex-shrink-0"
                onClick={() => { setStep(1); setSelectedSpoc(null); setProgress(1); reset(); }}
              >Change</button>
            </div>

            {/* Vehicle section */}
            <div className="flex items-center gap-2 mt-5 mb-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] bg-blue-100">🚗</div>
              <div>
                <div className="text-[13px] font-extrabold tracking-tight">Vehicle Details</div>
                <div className="text-[11px] text-gray-500">Select city and vehicle to audit</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-3.5">
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">City</label>
                <SearchDropdown
                  options={cityOptions}
                  value={form.city}
                  placeholder="Tap to search city…"
                  onChange={(val) => {
                    setField('city', val);
                    setField('vehicleNo', '');
                    setField('center', '');
                    setField('sm', '');
                    setField('director', '');
                    setField('workingStatus', '');
                  }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Vehicle Number</label>
                <SearchDropdown
                  options={vehicleOptions}
                  value={form.vehicleNo}
                  placeholder="Tap to search vehicle…"
                  summary={vehicleSummary}
                  disabled={!form.city}
                  onChange={(val) => {
                    setField('vehicleNo', val);
                    const v = vehicles.find(x => x.vehicle_no === val);
                    if (v) {
                      setField('center',        v.center      || '');
                      setField('sm',            v.sm          || '');
                      setField('director',      v.director    || '');
                      setField('workingStatus', v.status      || '');
                    }
                    setProgress(2);
                  }}
                />
              </div>

              {/* Vehicle info pill */}
              {selectedVehicle && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 bg-blue-50 rounded-xl px-3 py-2">
                  <span className="text-[12px] text-blue-800 font-bold">{selectedVehicle.vehicle_no}</span>
                  <span className="text-[12px] text-blue-300">·</span>
                  <span className="text-[12px] text-blue-800">Center: <strong>{selectedVehicle.center || '—'}</strong></span>
                  <span className="text-[12px] text-blue-300">·</span>
                  <span className="text-[12px] text-blue-800">SM: <strong>{selectedVehicle.sm || '—'}</strong></span>
                  <span className="text-[12px] text-blue-300">·</span>
                  <span className="text-[12px] text-blue-800">Status: <strong>{selectedVehicle.status || '—'}</strong></span>
                </div>
              )}

              {/* Duplicate warning */}
              {isDuplicate && (
                <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-[12px] text-amber-700">
                  <span className="text-base flex-shrink-0">⚠️</span>
                  <span>This vehicle has already been audited. Submitting again will be marked as <strong>duplicate</strong>.</span>
                </div>
              )}
            </div>

            {/* Checklists */}
            <ChecklistSection
              title="Body & Frame"
              icon="🔧"
              iconBg="bg-blue-100"
              items={BODY_CHECKS}
              values={bodyValues}
              remarks={bodyRemarks}
              onChange={setCheckValue}
              onRemark={setCheckRemark}
            />
            <ChecklistSection
              title="Electricals & Charger Port"
              icon="⚡"
              iconBg="bg-green-100"
              items={ELEC_CHECKS}
              values={elecValues}
              remarks={elecRemarks}
              onChange={setCheckValue}
              onRemark={setCheckRemark}
            />

            {/* Overall Assessment */}
            <div className="flex items-center gap-2 mt-5 mb-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] bg-amber-100">📋</div>
              <div className="flex-1">
                <div className="text-[13px] font-extrabold tracking-tight">Overall Assessment</div>
                <div className="text-[11px] text-gray-500">Rating, action &amp; remarks</div>
              </div>
              <span className="text-[10px] font-bold text-red-500 bg-red-50 rounded px-1.5 py-0.5">Required</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-3.5 space-y-4">
              {/* Rating */}
              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Condition Rating
                  <span className="ml-1.5 text-[9px] font-normal text-gray-400">(1 = Critical · 5 = Excellent)</span>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(n => {
                    const meta = RATING_META[n];
                    const sel  = form.overallCondition === n;
                    return (
                      <label key={n} className="flex-1 cursor-pointer">
                        <input type="radio" name="rating" value={n} checked={sel}
                          onChange={() => setField('overallCondition', n)} className="sr-only" />
                        <div className={`text-center py-2.5 px-1 rounded-xl border-[1.5px] transition-all
                          ${sel ? `${meta.cls} scale-105` : 'border-gray-200 text-gray-500 bg-white'}`}>
                          <div className="text-[14px] font-black">{n}</div>
                          <div className="text-[9px] font-medium mt-0.5">{meta.label}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action required */}
              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Immediate Action Required?</div>
                <div className="flex gap-2">
                  {(['Yes', 'No'] as const).map(opt => (
                    <label key={opt} className="flex-1 cursor-pointer">
                      <input type="radio" name="action" value={opt} checked={form.immediateAction === opt}
                        onChange={() => setField('immediateAction', opt)} className="sr-only" />
                      <div className={`text-center py-2.5 rounded-xl border-[1.5px] text-sm font-bold transition-all
                        ${form.immediateAction === opt && opt === 'Yes' ? 'bg-red-100 border-red-500 text-red-700'
                        : form.immediateAction === opt && opt === 'No'  ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-white border-gray-200 text-gray-500'}`}>
                        {opt === 'Yes' ? '⚠️ Yes — Action Needed' : '✅ No Issue'}
                      </div>
                    </label>
                  ))}
                </div>
                {form.immediateAction === 'Yes' && (
                  <textarea
                    className="mt-2.5 w-full border-[1.5px] border-gray-200 rounded-xl px-3.5 py-2.5 text-sm resize-none outline-none focus:border-blue-500 min-h-[60px]"
                    placeholder="Describe what action is needed…"
                    value={form.actionDetails}
                    onChange={e => setField('actionDetails', e.target.value)}
                  />
                )}
              </div>

              {/* Remarks */}
              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Additional Remarks</div>
                <textarea
                  className="w-full border-[1.5px] border-gray-200 rounded-xl px-3.5 py-2.5 text-sm resize-none outline-none focus:border-blue-500 min-h-[60px]"
                  placeholder="Any other observations…"
                  value={form.additionalRemarks}
                  onChange={e => setField('additionalRemarks', e.target.value)}
                />
              </div>
            </div>

            {/* Photos */}
            <PhotoSection slots={photos} onChange={setPhotos} missingAngles={missingPhotos} />

            <div className="h-4" />
          </>
        )}
      </div>

      {/* FOOTER */}
      {step === 2 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[560px] px-3.5 py-2.5
                        bg-white/95 backdrop-blur-md border-t border-gray-100 flex gap-2 shadow-xl z-20">
          <button
            className="px-5 py-3 rounded-xl bg-gray-100 text-gray-500 font-bold text-sm border border-gray-200"
            onClick={reset}
            disabled={submitting}
          >↺ Reset</button>
          <button
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#0f4c9e] to-[#1a6be8] text-white font-bold text-sm shadow-md disabled:opacity-50"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '⏳ Submitting…' : 'Submit Audit ✓'}
          </button>
        </div>
      )}

      <Toast message={toast.msg} visible={toast.visible} onHide={() => setToast(t => ({ ...t, visible: false }))} />
    </div>
  );
}
