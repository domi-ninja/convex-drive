"use server";
import { FileManagerProps } from "../App";
import { FileManageTable } from "./FileManageTable";


export function FileManagement({ fileUploadProps }: { fileUploadProps: FileManagerProps }) {
    return (
        <div className="p-8">
            <FileManageTable fileUploadProps={fileUploadProps}></FileManageTable>
        </div>
    );
} 