import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpDownloadZip } from "./httpDownloadZip";
import { getUserIdentity } from "./httpDesktopClientAuth";

const http = httpRouter();

// Add auth routes first
auth.addHttpRoutes(http);



httpDownloadZip(http);
getUserIdentity(http);


export default http;
