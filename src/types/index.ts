export type CheckValue = 'OK' | 'Not OK' | 'N/A' | '';

export interface Vehicle {
  id: string;
  vehicle_no: string;
  city: string;
  center?: string;
  sm?: string;
  director?: string;
  status?: string;
}

export interface Spoc {
  id: string;
  name: string;
  city: string;
}

export interface SpocGroup {
  spoc: string;
  cities: string[];
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface AuditFormState {
  spocName: string;
  city: string;
  vehicleNo: string;
  center: string;
  sm: string;
  director: string;
  workingStatus: string;
  // Body
  bodyDents: CheckValue;        bodyDentsRemark: string;
  bodyWindscreen: CheckValue;   bodyWindscreenRemark: string;
  bodyMirrors: CheckValue;      bodyMirrorsRemark: string;
  bodyFrame: CheckValue;        bodyFrameRemark: string;
  bodyDoors: CheckValue;        bodyDoorsRemark: string;
  bodyTyres: CheckValue;        bodyTyresRemark: string;
  // Electrical
  elecChargerPort: CheckValue;  elecChargerPortRemark: string;
  elecWiring: CheckValue;       elecWiringRemark: string;
  elecLights: CheckValue;       elecLightsRemark: string;
  elecDashboard: CheckValue;    elecDashboardRemark: string;
  elecHorn: CheckValue;         elecHornRemark: string;
  elecBrake: CheckValue;        elecBrakeRemark: string;
  // Overall
  overallCondition: number | null;
  immediateAction: 'Yes' | 'No' | '';
  actionDetails: string;
  additionalRemarks: string;
}

export interface PhotoSlots {
  chassis: PhotoSlot | null;
  front: PhotoSlot | null;
  back: PhotoSlot | null;
  left: PhotoSlot | null;
  right: PhotoSlot | null;
  damage: PhotoSlot | null;
}

export interface PhotoSlot {
  file: File;
  dataUrl: string;
  base64: string;
  mimeType: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  storagePath?: string;
  publicUrl?: string;
}

// Dashboard types
export interface CityRow {
  city: string;
  spoc: string;
  total: number;
  audited: number;
  pending: number;
  pct: number;
  flagged: number;
  lastAudit: string;
}

export interface SmRow {
  sm: string;
  city: string;
  center: string;
  total: number;
  audited: number;
  pending: number;
  pct: number;
  flagged: number;
}

export interface DashboardData {
  rows: CityRow[];
  smRows: SmRow[];
  grandTotal: number;
  grandAudited: number;
  grandPending: number;
  grandFlagged: number;
  grandPct: number;
}
