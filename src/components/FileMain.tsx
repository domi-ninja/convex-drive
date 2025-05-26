import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { FileManageTable } from "./FileManageTable";
import { FileUploadArea } from "./FileUploadArea";

export function FileManagement() {
    const files = useQuery(api.files.listFiles) || [];
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const saveFile = useMutation(api.files.saveFile);

    const handleUpload = async (files: FileList) => {
        if (!files || files.length === 0) return;

        for (const file of Array.from(files)) {
            try {
                const uploadUrl = await generateUploadUrl();
                const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": file.type },
                    body: file,
                });
                const { storageId } = await result.json();
                await saveFile({ storageId, name: file.name, type: file.type, size: file.size });
                toast.success(`Uploaded ${file.name}`);
            } catch (error) {
                console.error("Upload failed for file:", file.name, error);
                toast.error(`Failed to upload ${file.name}`);
            }
        }
    };

    return (
        <div className="p-8">
            <FileUploadArea
                onUpload={handleUpload}
            />

            <FileManageTable files={files}></FileManageTable>
        </div>
    );
} 