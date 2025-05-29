import { FileManagerProps } from "@/App";
import { FileManagement } from "@/components";

export function Home({ fileUploadProps }: { fileUploadProps: FileManagerProps }) {
    return <div>
        {fileUploadProps.currentFolderId}
        <FileManagement fileUploadProps={fileUploadProps} />
    </div>;
}