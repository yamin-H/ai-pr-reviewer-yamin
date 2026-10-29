import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "pr-review-agent-frontend",
    timestamp: new Date().toISOString()
  });
}