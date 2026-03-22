import { type NextRequest, NextResponse } from "next/server";
import path from "path";
import { existsSync } from "fs";
import mime from "mime-types";
import { getUserById } from "@/lib/auth";
import { readEncryptedFile } from "@/lib/storage";

/**
 * Serves files from the local uploads directory.
 * Path is /api/files/[subDir]/[fileName].
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 1. Auth check
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Path validation
    if (params.path.length < 2) {
      return new NextResponse("Invalid file path", { status: 400 });
    }

    const [subDir, fileName] = params.path;
    const filePath = path.join(process.cwd(), "uploads", subDir, fileName);

    if (!existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return new NextResponse("File not found", { status: 404 });
    }

    // 3. Decrypt and serve
    const fileBuffer = await readEncryptedFile(fileName, subDir);
    const contentType = mime.lookup(filePath) || "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-cache, no-store, must-revalidate", // No caching for sensitive files
      },
    });
  } catch (error) {
    console.error("File serving error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
