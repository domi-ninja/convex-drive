import { Id } from "../../convex/_generated/dataModel";

export interface FileWithUrl {
    _id: Id<"files">;
    _creationTime: number;
    name: string;
    type: string;
    size: number;
    url?: string | null;
} 