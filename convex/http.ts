import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

// Add auth routes first
auth.addHttpRoutes(http);

// Add streaming download endpoint
http.route({
    path: "/download-zip",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const body = await request.json();
        const fileOrFolders = body.filesOrFolders;
        const result = await ctx.runAction(api.fileActions.downloadFilesAsZipBytes, {
            filesOrFolders: fileOrFolders
        })
        console.log(result);
        return new Response(result.content, {
            headers: {
                "Content-Disposition": `attachment; filename="${result.filename}"`,
                "Content-Type": "application/zip",
                "Access-Control-Allow-Origin": "http://localhost:5173",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }),
});

// Handle CORS preflight request
http.route({
    path: "/download-zip",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
            },
        });
    }),
});

export default http;
