import { HttpRouter } from "convex/server";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

export function httpDownloadZip(http: HttpRouter) {
    // Add streaming download endpoint
    http.route({
        path: "/download-zip",
        method: "POST",
        handler: httpAction(async (ctx, request) => {
            let fileOrFolders;

            const user = await ctx.auth.getUserIdentity();
            console.log("user", user);
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

            const urls = await ctx.runAction(api.utils.getEnvironmentUrls, {});
            const convexSiteUrl = urls.CONVEX_SITE_URL;
            console.log(result);
            return new Response(result.content, {
                headers: {
                    "Content-Disposition": `attachment; filename="${result.filename}"`,
                    "Content-Type": "application/zip",
                    "Content-Length": result.content.byteLength.toString(),
                    "Access-Control-Allow-Origin": (process.env.NODE_ENV === "development" ? "*" : convexSiteUrl),
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Expose-Headers": "Content-Disposition",
                    // Add cache headers for better performance
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            });
        }),
    });

    // Handle CORS preflight request
    http.route({
        path: "/download-zip",
        method: "OPTIONS",
        handler: httpAction(async (ctx) => {

            const urls = await ctx.runAction(api.utils.getEnvironmentUrls, {});
            const convexSiteUrl = urls.CONVEX_SITE_URL;

            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": (process.env.NODE_ENV === "development" ? "*" : convexSiteUrl),
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Expose-Headers": "Content-Disposition",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }),
    });
}