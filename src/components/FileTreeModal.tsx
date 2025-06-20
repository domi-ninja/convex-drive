import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useFolderContext } from "../contexts/FolderContext";

interface TreeNode {
    _id: Id<"files"> | Id<"folders">;
    name: string;
    type: "file" | "folder";
    children?: TreeNode[];
    expanded?: boolean;
    parentId?: Id<"folders">;
}

interface FileTreeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: (folderId: Id<"folders">, folderName: string) => void;
}

export function FileTreeModal({ isOpen, onClose, onNavigate }: FileTreeModalProps) {
    const { rootFolderId, currentFolderId } = useFolderContext();
    const [expandedNodes, setExpandedNodes] = useState<Set<Id<"folders">>>(new Set());
    const [selectedNode, setSelectedNode] = useState<Id<"files"> | Id<"folders"> | null>(null);

    // Get the complete folder tree from root
    const rootFolderData = useQuery(
        api.folders.getFilesAndFoldersRec,
        rootFolderId ? { folderId: rootFolderId } : "skip"
    );

    // Get current folder path to auto-expand
    const currentFolderPath = useQuery(
        api.folders.getFolderPathRec,
        currentFolderId ? { folderId: currentFolderId } : "skip"
    );

    // Auto-expand path to current folder when modal opens
    useEffect(() => {
        if (isOpen && currentFolderId && currentFolderPath) {
            // Extract all folder IDs in the path to current folder
            const pathFolderIds = currentFolderPath.map(folder => folder._id);
            setExpandedNodes(new Set(pathFolderIds));
            setSelectedNode(currentFolderId);
        } else if (isOpen && rootFolderId) {
            // If no current folder path, at least expand the root
            setExpandedNodes(new Set([rootFolderId]));
        }
    }, [isOpen, currentFolderId, currentFolderPath, rootFolderId]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen]);

    const toggleNode = (nodeId: Id<"folders">) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    const handleFolderNodeClick = (node: TreeNode) => {
        console.log("handleNodeClick", node);
        setSelectedNode(node._id);
        onNavigate?.(node._id as Id<"folders">, node.name);
        onClose();
    };

    const renderTreeNode = (node: any, level: number = 0): React.JSX.Element => {
        const isExpanded = expandedNodes.has(node._id);
        const isSelected = selectedNode === node._id;
        const isCurrentFolder = currentFolderId === node._id;
        const hasChildren = node.folders && node.folders.length > 0;

        return (
            <div key={node._id} className={`select-none ${level === 0 ? 'mb-2' : ''}`}>
                <div
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-muted ${isSelected ? 'bg-accent text-accent-foreground' : ''
                        } ${isCurrentFolder ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                    style={{ paddingLeft: `${level * 20 + 8}px` }}
                    onClick={() => handleFolderNodeClick(node)}
                >
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleNode(node._id);
                            }}
                            className="p-2 border-2 border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                            {isExpanded ? (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    ) : (
                        <div className="w-4 h-4" />
                    )}

                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>

                    <span className={`text-sm ${isCurrentFolder ? 'font-semibold text-primary' : 'text-foreground'}`}>
                        {node.name}
                    </span>

                    {isCurrentFolder && (
                        <span className="text-xs text-primary ml-auto">Current</span>
                    )}
                </div>

                {isExpanded && hasChildren && (
                    <div className="ml-2">
                        {node.folders.map((childNode: any) => renderTreeNode(childNode, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen || !rootFolderData) return null;

    return (
        <div
            className="fixed inset-0 bg-background/50 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-popover text-popover-foreground rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-xl font-semibold">Folder Structure</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                        title="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    <div className="text-sm text-muted-foreground mb-4">
                        Click on any folder to navigate to it. Click the arrow icons to expand/collapse folders.
                    </div>

                    {renderTreeNode(rootFolderData)}
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-border bg-muted">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
} 