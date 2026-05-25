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
  riskProbability?: number;
  riskImpact?: number;
  scheduleCurve?: SCurvePoint[];
  costCurve?: SCurvePoint[];
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
