export type FarolStatus = 'verde' | 'amarelo' | 'vermelho' | 'cinza';
export type ProjectPhase = 'Iniciação' | 'Planejamento' | 'Execução' | 'Monitoramento' | 'Encerramento';
export type KnowledgeArea =
  | 'Escopo' | 'Prazo' | 'Custo' | 'Qualidade' | 'Riscos'
  | 'RH' | 'Comunicações' | 'Aquisições' | 'Partes Interessadas' | 'Integração';

export interface KPI {
  name: string;
  value: string | number;
  unit?: string;
  target?: string | number;
  status: 'on-track' | 'at-risk' | 'off-track' | 'unknown';
}

export interface SCurvePoint {
  month: string;
  planned: number;
  actual: number | null;
}

export interface MonthlyDataPoint {
  month: string;
  pv: number;
  ev: number | null;
  ac: number | null;
}

export interface Risk {
  id?: string;
  description: string;
  probability: number;
  impact: number;
  score: number;
  response?: string;
  responsible?: string;
}

export interface ProjectScope {
  plannedDeliverables?: number;
  completedDeliverables?: number;
  approvedChanges?: number;
  approvedChangesValue?: number;
  scopeCreepPct?: number;
}

export interface Project {
  id: string;
  name: string;
  company: string;
  farol: FarolStatus;
  description?: string;
  kpis: KPI[];
  difficulties: string[];
  attentionPoints: string[];
  status: string;
  progress?: number;
  deadline?: string;
  startDate?: string;
  budget?: { planned?: number; actual?: number; currency?: string };
  team?: string[];
  responsible?: string;
  lastUpdated: string;
  rawData?: string;
  phase?: ProjectPhase;
  knowledgeArea?: KnowledgeArea;
  // EVM
  ev?: number;
  pv?: number;
  ac?: number;
  bac?: number;
  riskProbability?: number;
  riskImpact?: number;
  scheduleCurve?: SCurvePoint[];
  costCurve?: SCurvePoint[];
  // New
  monthlyData?: MonthlyDataPoint[];
  risks?: Risk[];
  scope?: ProjectScope;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface LoadedFile {
  id: string;
  fileName: string;
  format: string;
  projectCount: number;
  projectIds: string[];
  uploadedAt: string;
  source?: 'upload' | 'onedrive' | 'googledrive';
}

export interface FileUploadResult {
  fileName: string;
  format: string;
  projects: Project[];
}

export interface ProjectFilters {
  farol: FarolStatus | 'all';
  phases: ProjectPhase[];
  knowledgeAreas: KnowledgeArea[];
  dateStart: string;
  dateEnd: string;
}

// ─── Multi-file consolidation types ─────────────────────────────────────────

export interface FileExtractionField {
  fieldName: string;
  value: unknown;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface FileExtraction {
  fileName: string;
  filePath: string;
  fileDate: string;
  fields: FileExtractionField[];
}

export interface ConsolidatedFieldConfirmed {
  fieldName: string;
  value: unknown;
  source: string;
  reasoning: string;
}

export interface ConsolidatedFieldConflict {
  fieldName: string;
  options: {
    value: unknown;
    source: string;
    fileDate: string;
    reasoning: string;
    recommended: boolean;
  }[];
}

export interface ConsolidatedFieldNeedsReview {
  fieldName: string;
  value: unknown;
  source: string;
  confidence: 'medium' | 'low';
  reasoning: string;
}

export interface ConsolidatedProject {
  confirmed: ConsolidatedFieldConfirmed[];
  conflicts: ConsolidatedFieldConflict[];
  missing: string[];
  needsReview: ConsolidatedFieldNeedsReview[];
  projectName?: string;
  sourceFiles: string[];
}

export interface DriveFileWithPath {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  filePath: string;
}
