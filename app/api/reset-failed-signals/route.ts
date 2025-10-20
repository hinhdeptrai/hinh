import { NextRequest } from "next/server"
import { query } from "@/lib/db"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    // Reset all FAILED signals back to PENDING
    const result = await query(`
      UPDATE signal_queue 
      SET status = 'PENDING', error_message = NULL, processed_at = NULL
      WHERE status = 'FAILED'
    `)
    
    return Response.json({
      success: true,
      message: "Failed signals reset to PENDING",
      affected: result,
    }, { status: 200 })
    
  } catch (e: any) {
    console.error("Reset failed signals error:", e)
    return Response.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    )
  }
}

