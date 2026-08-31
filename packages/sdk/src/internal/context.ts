import { createContext, useContext } from 'react';

/** Configuration passed to StackbyProvider */
export interface StackbyConfig {
  /** URL of the Studio Data Gateway (e.g. https://gateway.studio.stackby.com) */
  gatewayUrl: string;
  /** Signed artifact runtime JWT */
  authToken: string;
  /** Stackby stack ID this artifact reads from */
  stackId: string;
  /** Artifact ID registered in the gateway */
  artifactId: string;
  /** Enable DataInspector overlay (default: false) */
  debug?: boolean;
}

export interface StackbyContextValue {
  config: StackbyConfig;
}

export const StackbyContext = createContext<StackbyContextValue | null>(null);

export function useStackbyContext(): StackbyContextValue {
  const ctx = useContext(StackbyContext);
  if (!ctx) throw new Error('useStackbyContext must be used inside <StackbyProvider>');
  return ctx;
}
