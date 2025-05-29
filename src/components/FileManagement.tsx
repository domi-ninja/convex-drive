"use server";
import { FileManageTable } from "./FileManageTable";
import { FileUploadAreaProps } from "./FileUploadArea";


export function FileManagement({ fileUploadProps }: { fileUploadProps: FileUploadAreaProps }) {
    return (
        <div className="p-8">
            <FileManageTable fileUploadProps={fileUploadProps}></FileManageTable>
        </div>
    );
} 