import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const logs = await req.json();

    // Save to c:\projects\AISIGNAL\evaluation-log.json
    const filePath = path.join(process.cwd(), "evaluation-log.json");
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), "utf8");

    // Also write to src/logs directory if it exists or create it
    const logDir = path.join(process.cwd(), "src", "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(path.join(logDir, "evaluation-log.json"), JSON.stringify(logs, null, 2), "utf8");

    return NextResponse.json({ success: true, path: filePath });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
