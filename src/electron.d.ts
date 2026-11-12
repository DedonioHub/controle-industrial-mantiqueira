
interface Window {
  mantiqueira: {
    appName: string
    appVersion: string
    database: {
      getStatus: () => Promise<{
        connected: boolean
        path: string
      }>
    }
  }
}
