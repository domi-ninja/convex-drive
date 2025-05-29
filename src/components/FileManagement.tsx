"use server";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { FileManageTable } from "./FileManageTable";
import { FileUploadAreaProps } from "./FileUploadArea";


export function FileManagement({ fileUploadProps }: { fileUploadProps: FileUploadAreaProps }) {

    // All hooks must be called before any conditional returns
    const saveFile = useMutation(api.files.saveFile);
    const generateUploadUrl = useMutation(api.files.generateFileUploadUrl);
    const ensureRootFolder = useMutation(api.folders.ensureRootFolder);


    const user = useQuery(api.auth.loggedInUser);

    const rootFolderId = fileUploadProps.rootFolderId;

    // // Always call useQuery, but with null for folderId if not available
    // const filesQuery = useQuery(api.files.listFilesInFolder,
    //     rootFolderId ? { folderId: rootFolderId } : "skip"
    // );

    // const files = filesQuery || [];
    // // add folder to the files list
    // const folder = useQuery(api.folders.getFolder, { folderId: rootFolderId });


    if (!user?._id) {
        return <div>Please log in</div>;
    }


    return (
        <div className="p-8">
            <FileManageTable rootFolderId={rootFolderId as Id<"folders">}></FileManageTable>
        </div>
    );
} 