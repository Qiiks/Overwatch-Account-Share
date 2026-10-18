"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive" | "warning"
}

const VARIANT_STYLES: Record<string, { title: string; action: string }> = {
  destructive: {
    title: "text-alarm",
    action: "bg-alarm text-ground hover:bg-alarm/90",
  },
  warning: {
    title: "text-warn",
    action: "bg-warn text-ground hover:bg-warn/90",
  },
  default: {
    title: "text-ink",
    action: "bg-signal text-signal-ink hover:bg-accent",
  },
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}: ConfirmationDialogProps) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="border-line-2 bg-panel-2 text-ink">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-mono text-2xs tracking-label uppercase">
            <span className={styles.title}>{title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-ink-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onClose}
            className="border-line-2 bg-transparent text-ink-2 hover:bg-white/5 hover:text-ink"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={styles.action}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
