import type { HttpRouter } from "convex/server";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

export function httpDownloadZip(http: HttpRouter) {
    const siteUrl = process.env.SITE_URL;
    if (!siteUrl) {
        throw new Error("SITE_URL is required for download CORS");
    }

    http.route({
        path: "/download-zip",
        method: "POST",
        handler: httpAction(async (ctx, request) => {
            const requestOrigin = request.headers.get("origin");
            if (requestOrigin && requestOrigin !== siteUrl) {
                return new Response("Forbidden origin", { status: 403 });
            }

            let fileOrFolders;

            const user = await ctx.auth.getUserIdentity();
            if (!user) {
                return new Response("Unauthorized", { status: 401 });
            }

            // Handle both JSON and form data
            const contentType = request.headers.get("content-type");
            if (contentType?.includes("application/json")) {
                const body = await request.json();
                fileOrFolders = body.filesOrFolders;
            } else if (contentType?.includes("application/x-www-form-urlencoded")) {
                const formData = await request.formData();
                const filesOrFoldersString = formData.get("filesOrFolders") as string;
                fileOrFolders = JSON.parse(filesOrFoldersString);
            } else {
                // Fallback: try to parse as JSON
                const body = await request.json();
                fileOrFolders = body.filesOrFolders;
            }

            const result = await ctx.runAction(api.fileActions.downloadFilesAsZipBytes, {
                filesOrFolders: fileOrFolders
            });

            return new Response(result.content, {
                headers: {
                    "Content-Disposition": `attachment; filename="${result.filename}"`,
                    "Content-Type": "application/zip",
                    "Content-Length": result.content.byteLength.toString(),
                    "Access-Control-Allow-Origin": siteUrl,
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Expose-Headers": "Content-Disposition",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            });
        }),
    });

    http.route({
        path: "/download-zip",
        method: "OPTIONS",
        handler: httpAction(async (_ctx, request) => {
            if (request.headers.get("origin") !== siteUrl) {
                return new Response("Forbidden origin", { status: 403 });
            }

            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": siteUrl,
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Expose-Headers": "Content-Disposition",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }),
    });
}
