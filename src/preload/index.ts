import { contextBridge } from 'electron'

// Placeholder — will be populated with typed API in Task #4
const api = {} as const

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
