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
  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          title: "text-red-400",
          action: "bg-red-600 hover:bg-red-700 text-white",
        }
      case "warning":
        return {
          title: "text-yellow-400",
          action: "bg-yellow-500/80 hover:bg-yellow-500 text-white",
        }
      default:
        return {
          title: "text-[#DA70D6]",
          action: "bg-[#DA70D6]/80 hover:bg-[#DA70D6] text-white",
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="bg-[#111111]/95 backdrop-blur-md border-white/10 text-[#EAEAEA]">
        <AlertDialogHeader>
          <AlertDialogTitle className={styles.title}>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[#EAEAEA]/70">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onClose}
            className="bg-white/5 border-white/10 text-[#EAEAEA] hover:bg-white/10"
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