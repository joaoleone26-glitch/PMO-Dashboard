export type FarolStatus = 'verde' | 'amarelo' | 'vermelho' | 'cinza';

export interface KPI {
  name: string;
  value: string | number;
  unit?: string;
  target?: string | number;
  status: 'on-track' | 'at-risk' | 'off-track' | 'unknown';
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
  budget?: {
    planned?: number;
    actual?: number;
    currency?: string;
  };
  team?: string[];
  responsible?: string;
  lastUpdated: string;
  rawData?: string;
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
}

export interface FileUploadResult {
  fileName: string;
  format: string;
  projects: Project[];
}
