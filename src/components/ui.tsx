import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import * as RadixDialog from "@radix-ui/react-dialog";

// 1. Loading Button component
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export function LoadingButton({ loading, children, className = "", disabled, ...props }: LoadingButtonProps) {
  return (
    <button
      className={`button ${className} ${loading ? "flex items-center justify-center gap-2" : ""}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

// 2. Custom Dialog Component (Portal-based centered modal)
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
  return (
    <RadixDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="overlay" />
        <RadixDialog.Content className="dialog max-w-md w-full bg-surface text-text-primary p-6 rounded-2xl border border-border shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <RadixDialog.Title className="text-xl font-semibold font-serif">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-surface-muted">
                <X className="w-5 h-5" />
                <span className="sr-only">Fechar</span>
              </button>
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// 3. Custom Bottom Sheet/Drawer component for mobile/tablet responsive actions
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  return (
    <RadixDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="overlay" />
        <RadixDialog.Content className="bottom-sheet w-full bg-surface text-text-primary border-t border-border">
          <div className="bottom-sheet-handle" />
          <div className="flex justify-between items-center mb-4">
            <RadixDialog.Title className="text-lg font-semibold font-serif">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-surface-muted">
                <X className="w-5 h-5" />
              </button>
            </RadixDialog.Close>
          </div>
          <div className="mt-2">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// 4. Custom Confirm Dialog
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">{description}</p>
        <div className="dialog-actions flex justify-end gap-3 mt-2">
          <button className="button secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`button ${isDestructive ? "danger" : ""}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

// 5. Custom Prompt Dialog
interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  isOpen,
  title,
  description,
  placeholder = "Digite aqui...",
  defaultValue = "",
  confirmLabel = "Salvar",
  cancelLabel = "Cancelar",
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onCancel} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {description && <p className="text-sm text-text-secondary">{description}</p>}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full"
          autoFocus
        />
        <div className="flex justify-end gap-3 mt-2">
          <button type="button" className="button secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="submit" className="button" disabled={!value.trim()}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
