import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpDesktopClientAuth } from "./httpDesktopClientAuth";
import { httpDownloadZip } from "./httpDownloadZip";

const http = httpRouter();

// Add auth routes first
auth.addHttpRoutes(http);



httpDownloadZip(http);
httpDesktopClientAuth(http);


export default http;
