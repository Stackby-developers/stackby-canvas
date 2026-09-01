export interface DesignTokens {
  id: string;
  workspaceId: string;
  projectId?: string;
  name: string;
  colors?: Record<string, string>;
  typography?: {
    fontFamily?: string;
    fontSize?: Record<string, string>;
    fontWeight?: Record<string, string | number>;
    lineHeight?: Record<string, string>;
    letterSpacing?: Record<string, string>;
  };
  spacing?: Record<string, string>;
  radii?: Record<string, string>;
  shadows?: Record<string, string>;
  version: number;
  updatedAt: string;
}

export interface DesignSystemRecord {
  id: string;
  workspaceId: string;
  name: string;
  brandUrl?: string;
  notes?: string;
  tokens?: DesignTokens;
  version: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}
