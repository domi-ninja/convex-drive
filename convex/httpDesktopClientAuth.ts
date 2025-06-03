import { HttpRouter } from "convex/server";
import { httpAction } from "./_generated/server";


export function getUserIdentity(http: HttpRouter) {

    // Token verification endpoint for API requests
    http.route({
        path: "/auth/identity",
        method: "GET",
        handler: httpAction(async (ctx, request) => {

            const user = await ctx.auth.getUserIdentity();
            if (!user) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
            }
            console.log("user", user);

            return new Response(JSON.stringify(user), { status: 200 });
        }),
    });
}


