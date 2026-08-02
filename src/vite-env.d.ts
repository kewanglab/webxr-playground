/// <reference types="vite/client" />

/**
 * The agent-harness seam. `@iwsdk/vite-plugin-dev` declares this global in a
 * file it does not export from its package entry, so the contract is restated
 * here rather than reached for through a deep import into its `dist/`.
 * Implemented by `src/dev/agentHarness.tsx` in development only.
 */
interface FrameworkMCPRuntime {
  handles(method: string): boolean
  dispatch(method: string, params: Record<string, unknown>): Promise<unknown>
}

interface Window {
  FRAMEWORK_MCP_RUNTIME?: FrameworkMCPRuntime
}
