import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpDownloadZip } from "./httpDownloadZip";

const http = httpRouter();

auth.addHttpRoutes(http);
httpDownloadZip(http);

export default http;
