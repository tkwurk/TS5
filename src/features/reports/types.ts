/** Repo-backed sales summary returned by the Reporting Worker. */
export interface SalesSummary {
  source: string
  outlet: string | null
  lineCount: number
  totalSales: number
  totalQty: number
  byPayment: Record<string, number>
}

/** Shape of the report.requested pipeline result (apiOk data). */
export interface ReportPipeline {
  steps?: {
    reporting?: {
      data?: { report?: SalesSummary }
      report?: SalesSummary
    }
  }
}

export function summaryOf(data: ReportPipeline | null | undefined): SalesSummary | undefined {
  const reporting = data?.steps?.reporting
  return reporting?.data?.report ?? reporting?.report
}
