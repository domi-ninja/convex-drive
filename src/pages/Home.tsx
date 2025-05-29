import { FileManagement } from "@/components";
import { FileUploadAreaProps } from "@/components/FileUploadArea";

export function Home({ fileUploadProps }: { fileUploadProps: FileUploadAreaProps }) {
    return <div>
        <FileManagement fileUploadProps={fileUploadProps} />
    </div>;
}