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

export interface MonthlyDataPoint {
  month: string;
  pv: number;
  ev: number | null;
  ac: number | null;
}

// Legacy S-curve point format (still used as fallback in charts)
export interface SCurvePoint {
  month: string;
  planned: number;
  actual: number | null;
}

export interface Risk {
  id?: string;
  description: string;
  probability: number;  // 1-5
  impact: number;       // 1-5
  score: number;        // probability * impact (max 25)
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
  status: string;
  progress?: number;
  startDate?: string;
  deadline?: string;
  responsible?: string;
  phase?: ProjectPhase;
  knowledgeArea?: KnowledgeArea;
  kpis: KPI[];
  difficulties: string[];
  attentionPoints: string[];
  budget?: { planned?: number; actual?: number; currency?: string };
  team?: string[];
  lastUpdated: string;
  rawData?: string;
  // EVM
  bac?: number;
  ev?: number;
  pv?: number;
  ac?: number;
  // Risco principal
  riskProbability?: number;
  riskImpact?: number;
  // Dados detalhados
  monthlyData?: MonthlyDataPoint[];
  scheduleCurve?: SCurvePoint[];
  costCurve?: SCurvePoint[];
  risks?: Risk[];
  scope?: ProjectScope;
}

export interface FileExtractionField {
  fieldName: string;
  value: unknown;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface FileExtraction {
  fileName: string;
  filePath: string;
  fileDate: string;  // data de modificação real do arquivo no Drive
  fields: FileExtractionField[];
}

export interface ConsolidatedProject {
  projectName?: string;
  sourceFiles: string[];
  confirmed: {
    fieldName: string;
    value: unknown;
    source: string;
    reasoning: string;
  }[];
  conflicts: {
    fieldName: string;
    options: {
      value: unknown;
      source: string;
      fileDate: string;
      reasoning: string;
      recommended: boolean;
    }[];
  }[];
  needsReview: {
    fieldName: string;
    value: unknown;
    source: string;
    confidence: 'medium' | 'low';
    reasoning: string;
  }[];
  missing: string[];
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

export interface DriveFileWithPath {
  id: string;
  name: string;
  mimeType: string;
  filePath: string;
  modifiedTime: string;
  size?: number;
}
