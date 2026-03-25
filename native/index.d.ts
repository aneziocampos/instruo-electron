export interface ElementInfo {
  role: string | null
  subrole: string | null
  title: string | null
  value: string | null
  description: string | null
  help: string | null
  x: number | null
  y: number | null
  width: number | null
  height: number | null
  pid: number
  childrenCount: number
}

export interface ParentInfo {
  role: string | null
  title: string | null
}

export function checkAccessibility(prompt: boolean): boolean
export function getElementAtPosition(x: number, y: number): ElementInfo | null
export function getParentChain(x: number, y: number, maxDepth?: number): ParentInfo[]
export function getProcessName(pid: number): string | null
