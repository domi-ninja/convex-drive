
export const cleanFileName = (fileName: string) => {
    // Remove characters that are not allowed in Windows filenames
    // Windows disallows: < > : " | ? * and control characters (0-31)
    return fileName.trim().replace(/[^a-zA-Z0-9_\-\(\)\[\]\.]/g, "_");
};


