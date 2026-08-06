declare module 'open-nagish' {
  export interface OpenNagishStatementData {
    orgName?: string
    orgPhone?: string
    orgEmail?: string
    coordinatorName?: string
    lastAuditDate?: string
  }

  export interface OpenNagishOptions {
    position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
    lang?: 'he' | 'en' | 'ar' | 'ru'
    bottomOffset?: number
    mobileBottomOffset?: number
    statementUrl?: string
    statementData?: OpenNagishStatementData
  }

  export interface OpenNagishWidget {
    destroy(): void
  }

  export function init(options?: OpenNagishOptions): OpenNagishWidget
}
