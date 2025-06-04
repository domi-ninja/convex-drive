declare module 'sonner' {
    export interface ToastType {
        (message: string | { title: string; variant?: string; description?: string }): void;
        success: (message: string | { title: string; variant?: string; description?: string }) => void;
        error: (message: string | { title: string; variant?: string; description?: string }) => void;
        info: (message: string | { title: string; variant?: string; description?: string }) => void;
        warning: (message: string | { title: string; variant?: string; description?: string }) => void;
        loading: (message: string | { title: string; variant?: string; description?: string }) => void;
    }

    export const toast: ToastType;
    export const Toaster: React.FC<any>;
    export const useToast: () => { toast: ToastType };
} 