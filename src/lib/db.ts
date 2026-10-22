import { supabase, STORAGE_BUCKET, DEMO_MODE } from './supabase';
import type { AuditFormState, SpocGroup, Vehicle, DashboardData, CityRow, SmRow } from '../types';

// ── MOCK DATA (used when Supabase env is not configured) ─────
const MOCK_VEHICLES: Vehicle[] = [
  { id:'1', vehicle_no:'DL01EV001', city:'Delhi',     center:'Okhla Hub',      sm:'Vikram Anand',   director:'Suresh Patil',  status:'Working'   },
  { id:'2', vehicle_no:'DL01EV002', city:'Delhi',     center:'Okhla Hub',      sm:'Vikram Anand',   director:'Suresh Patil',  status:'Working'   },
  { id:'3', vehicle_no:'DL01EV003', city:'Delhi',     center:'Rohini Center',  sm:'Manish Gupta',   director:'Suresh Patil',  status:'Breakdown' },
  { id:'4', vehicle_no:'MH01EV001', city:'Mumbai',    center:'Andheri Hub',    sm:'Pooja Mehta',    director:'Ramesh Rao',    status:'Working'   },
  { id:'5', vehicle_no:'MH01EV002', city:'Mumbai',    center:'Andheri Hub',    sm:'Pooja Mehta',    director:'Ramesh Rao',    status:'Working'   },
  { id:'6', vehicle_no:'KA01EV001', city:'Bangalore', center:'Whitefield Hub', sm:'Arjun Nair',     director:'Deepak Sharma', status:'Working'   },
  { id:'7', vehicle_no:'KA01EV002', city:'Bangalore', center:'Whitefield Hub', sm:'Arjun Nair',     director:'Deepak Sharma', status:'Idle'      },
  { id:'8', vehicle_no:'TN01EV001', city:'Chennai',   center:'OMR Center',     sm:'Sundaram Raja',  director:'Ganesh Kumar',  status:'Working'   },
  { id:'9', vehicle_no:'HR01EV001', city:'Gurgaon',   center:'Sector 18 Hub',  sm:'Anil Yadav',     director:'Suresh Patil',  status:'Working'   },
];

const MOCK_SPOCS: SpocGroup[] = [
  { spoc:'Rahul Sharma', cities:['Delhi','Gurgaon'] },
  { spoc:'Priya Singh',  cities:['Mumbai','Pune']   },
  { spoc:'Amit Kumar',   cities:['Bangalore']        },
  { spoc:'Neha Joshi',   cities:['Chennai','Coimbatore'] },
];

// ── SPOC LIST ────────────────────────────────────────────────
export async function fetchSpocs(): Promise<SpocGroup[]> {
  if (DEMO_MODE) return MOCK_SPOCS;
  const { data, error } = await supabase.from('spocs').select('name, city').order('name');
  if (error) throw error;
  const map: Record<string, Set<string>> = {};
  for (const row of data) {
    if (!map[row.name]) map[row.name] = new Set();
    map[row.name].add(row.city);
  }
  return Object.keys(map).sort().map(spoc => ({ spoc, cities: [...map[spoc]].sort() }));
}

// ── VEHICLES ─────────────────────────────────────────────────
export async function fetchVehicles(): Promise<Vehicle[]> {
  if (DEMO_MODE) return MOCK_VEHICLES;
  const { data, error } = await supabase.from('vehicles').select('*').order('vehicle_no');
  if (error) throw error;
  return data as Vehicle[];
}

// ── AUDITED SET ──────────────────────────────────────────────
export async function fetchAuditedVehicleNos(): Promise<Set<string>> {
  if (DEMO_MODE) return new Set<string>();
  const { data, error } = await supabase
    .from('audit_responses')
    .select('vehicle_no');
  if (error) throw error;
  return new Set(data.map((r: { vehicle_no: string }) => r.vehicle_no));
}

// ── UPLOAD PHOTO ─────────────────────────────────────────────
export async function uploadPhoto(
  base64: string,
  mimeType: string,
  fileName: string,
  city: string,
  vehicleNo: string,
): Promise<string> {
  if (DEMO_MODE) return 'https://placeholder.example.com/photo.jpg';

  const byteStr  = atob(base64);
  const arr      = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
  const blob     = new Blob([arr], { type: mimeType });
  const path     = `${city}/${vehicleNo}/${fileName}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ── SAVE AUDIT ───────────────────────────────────────────────
export async function saveAudit(
  form: AuditFormState,
  photoUrls: Record<string, string>,
  isDuplicate: boolean,
): Promise<void> {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, 800)); // simulate latency
    return;
  }
  const { error } = await supabase.from('audit_responses').insert({
    spoc_name:               form.spocName,
    city:                    form.city,
    center:                  form.center,
    vehicle_no:              form.vehicleNo,
    sm:                      form.sm,
    director:                form.director,
    working_status:          form.workingStatus,
    body_dents:              form.bodyDents,              body_dents_remark:       form.bodyDentsRemark,
    body_windscreen:         form.bodyWindscreen,         body_windscreen_remark:  form.bodyWindscreenRemark,
    body_mirrors:            form.bodyMirrors,            body_mirrors_remark:     form.bodyMirrorsRemark,
    body_frame:              form.bodyFrame,              body_frame_remark:       form.bodyFrameRemark,
    body_doors:              form.bodyDoors,              body_doors_remark:       form.bodyDoorsRemark,
    body_tyres:              form.bodyTyres,              body_tyres_remark:       form.bodyTyresRemark,
    elec_charger_port:       form.elecChargerPort,        elec_charger_port_remark: form.elecChargerPortRemark,
    elec_wiring:             form.elecWiring,             elec_wiring_remark:      form.elecWiringRemark,
    elec_lights:             form.elecLights,             elec_lights_remark:      form.elecLightsRemark,
    elec_dashboard:          form.elecDashboard,          elec_dashboard_remark:   form.elecDashboardRemark,
    elec_horn:               form.elecHorn,               elec_horn_remark:        form.elecHornRemark,
    elec_brake:              form.elecBrake,              elec_brake_remark:       form.elecBrakeRemark,
    overall_condition:       form.overallCondition,
    immediate_action:        form.immediateAction,
    action_details:          form.actionDetails,
    additional_remarks:      form.additionalRemarks,
    photo_front:             photoUrls.front  || null,
    photo_back:              photoUrls.back   || null,
    photo_left:              photoUrls.left   || null,
    photo_right:             photoUrls.right  || null,
    photo_damage:            photoUrls.damage || null,
    is_duplicate:            isDuplicate,
  });
  if (error) throw error;
}

// ── DASHBOARD DATA ───────────────────────────────────────────
export async function fetchDashboardData(): Promise<DashboardData> {
  if (DEMO_MODE) return getMockDashboard();

  const [vRes, spocRes, aRes] = await Promise.all([
    supabase.from('vehicles').select('vehicle_no, city, center, sm'),
    supabase.from('spocs').select('name, city'),
    supabase.from('audit_responses').select('vehicle_no, city, center, sm, immediate_action, submitted_at'),
  ]);
  if (vRes.error) throw vRes.error;

  // Build maps
  const totalPerCity: Record<string, Set<string>> = {};
  const smData: Record<string, { sm: string; city: string; center: string; vehicles: Set<string> }> = {};
  for (const v of vRes.data) {
    if (!v.vehicle_no || !v.city) continue;
    if (!totalPerCity[v.city]) totalPerCity[v.city] = new Set();
    totalPerCity[v.city].add(v.vehicle_no);
    if (v.sm) {
      const k = `${v.sm}||${v.city}||${v.center || ''}`;
      if (!smData[k]) smData[k] = { sm: v.sm, city: v.city, center: v.center || '', vehicles: new Set() };
      smData[k].vehicles.add(v.vehicle_no);
    }
  }

  const spocMap: Record<string, string> = {};
  if (spocRes.data) for (const s of spocRes.data) spocMap[s.city] = s.name;

  const auditedPerCity: Record<string, Set<string>> = {};
  const flaggedPerCity: Record<string, number>      = {};
  const lastAuditPerCity: Record<string, string>    = {};
  const auditedPerSm: Record<string, Set<string>>   = {};
  const flaggedPerSm: Record<string, number>        = {};

  if (aRes.data) {
    for (const a of aRes.data) {
      const city = a.city; const vno = a.vehicle_no;
      if (!city || !vno) continue;
      if (!auditedPerCity[city]) auditedPerCity[city] = new Set();
      auditedPerCity[city].add(vno);
      if (a.immediate_action === 'Yes') flaggedPerCity[city] = (flaggedPerCity[city] || 0) + 1;
      if (a.submitted_at) {
        const d = new Date(a.submitted_at);
        const str = d.toLocaleDateString('en-IN', { day:'numeric', month:'short' }) + ', ' +
                    d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
        if (!lastAuditPerCity[city]) lastAuditPerCity[city] = str;
      }
      if (a.sm) {
        const k = `${a.sm}||${city}||${a.center || ''}`;
        if (!auditedPerSm[k]) auditedPerSm[k] = new Set();
        auditedPerSm[k].add(vno);
        if (a.immediate_action === 'Yes') flaggedPerSm[k] = (flaggedPerSm[k] || 0) + 1;
      }
    }
  }

  const rows: CityRow[] = Object.keys(totalPerCity).sort().map(city => {
    const total   = totalPerCity[city].size;
    const audited = (auditedPerCity[city] || new Set()).size;
    return {
      city, spoc: spocMap[city] || '—', total, audited,
      pending: total - audited,
      pct: total > 0 ? Math.round((audited / total) * 100) : 0,
      flagged: flaggedPerCity[city] || 0,
      lastAudit: lastAuditPerCity[city] || '—',
    };
  });

  const smRows: SmRow[] = Object.keys(smData).map(k => {
    const d       = smData[k];
    const total   = d.vehicles.size;
    const audited = (auditedPerSm[k] || new Set()).size;
    return {
      sm: d.sm, city: d.city, center: d.center, total, audited,
      pending: total - audited,
      pct: total > 0 ? Math.round((audited / total) * 100) : 0,
      flagged: flaggedPerSm[k] || 0,
    };
  });

  const grandTotal   = rows.reduce((s, r) => s + r.total,   0);
  const grandAudited = rows.reduce((s, r) => s + r.audited, 0);
  const grandPending = rows.reduce((s, r) => s + r.pending, 0);
  const grandFlagged = rows.reduce((s, r) => s + r.flagged, 0);
  const grandPct     = grandTotal > 0 ? Math.round((grandAudited / grandTotal) * 100) : 0;

  return { rows, smRows, grandTotal, grandAudited, grandPending, grandFlagged, grandPct };
}

function getMockDashboard(): DashboardData {
  const rows: CityRow[] = [
    { city:'Delhi',     spoc:'Rahul Sharma', total:3, audited:1, pending:2, pct:33,  flagged:0, lastAudit:'22 Oct, 09:15' },
    { city:'Mumbai',    spoc:'Priya Singh',  total:2, audited:2, pending:0, pct:100, flagged:1, lastAudit:'22 Oct, 10:30' },
    { city:'Bangalore', spoc:'Amit Kumar',   total:2, audited:0, pending:2, pct:0,   flagged:0, lastAudit:'—' },
    { city:'Chennai',   spoc:'Neha Joshi',   total:1, audited:1, pending:0, pct:100, flagged:0, lastAudit:'21 Oct, 14:20' },
    { city:'Gurgaon',   spoc:'Rahul Sharma', total:1, audited:0, pending:1, pct:0,   flagged:0, lastAudit:'—' },
  ];
  const smRows: SmRow[] = [
    { sm:'Vikram Anand',  city:'Delhi',     center:'Okhla Hub',      total:2, audited:1, pending:1, pct:50,  flagged:0 },
    { sm:'Manish Gupta',  city:'Delhi',     center:'Rohini Center',  total:1, audited:0, pending:1, pct:0,   flagged:0 },
    { sm:'Pooja Mehta',   city:'Mumbai',    center:'Andheri Hub',    total:2, audited:2, pending:0, pct:100, flagged:1 },
    { sm:'Arjun Nair',    city:'Bangalore', center:'Whitefield Hub', total:2, audited:0, pending:2, pct:0,   flagged:0 },
    { sm:'Sundaram Raja', city:'Chennai',   center:'OMR Center',     total:1, audited:1, pending:0, pct:100, flagged:0 },
    { sm:'Anil Yadav',    city:'Gurgaon',   center:'Sector 18 Hub',  total:1, audited:0, pending:1, pct:0,   flagged:0 },
  ];
  const grandTotal   = rows.reduce((s, r) => s + r.total,   0);
  const grandAudited = rows.reduce((s, r) => s + r.audited, 0);
  return {
    rows, smRows, grandTotal, grandAudited,
    grandPending: grandTotal - grandAudited,
    grandFlagged: rows.reduce((s, r) => s + r.flagged, 0),
    grandPct: grandTotal > 0 ? Math.round((grandAudited / grandTotal) * 100) : 0,
  };
}
