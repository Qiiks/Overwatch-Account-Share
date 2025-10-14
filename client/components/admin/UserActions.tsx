"use client"

import { useState } from "react"
import { MoreVertical, UserCheck, UserX, Trash2, Shield, ShieldOff } from "lucide-react"
import { GlassButton } from "@/components/ui/GlassButton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "./ConfirmationDialog"

interface User {
  id: string
  username: string
  email: string
  role: "user" | "admin"
  status: "active" | "suspended" | "pending"
}

interface UserActionsProps {
  user: User
  currentUserId: string | null
  onStatusChange: (userId: string, status: "active" | "suspended") => void
  onRoleChange: (userId: string, role: "user" | "admin") => void
  onDelete: (userId: string) => void
}

export function UserActions({ user, currentUserId, onStatusChange, onRoleChange, onDelete }: UserActionsProps) {
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const isSelf = user.id === currentUserId
  const isActive = user.status === "active"
  const isSuspended = user.status === "suspended"
  const isPending = user.status === "pending"

  const handleSuspend = () => {
    setShowSuspendDialog(false)
    onStatusChange(user.id, "suspended")
  }

  const handleActivate = () => {
    onStatusChange(user.id, "active")
  }

  const handleDelete = () => {
    setShowDeleteDialog(false)
    onDelete(user.id)
  }

  const handleMakeAdmin = () => {
    onRoleChange(user.id, "admin")
  }

  const handleRemoveAdmin = () => {
    onRoleChange(user.id, "user")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <GlassButton size="sm" variant="ghost" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </GlassButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-48 bg-[#111111]/95 backdrop-blur-md border-white/10"
        >
          {/* Status Actions */}
          {isActive && !isSelf && (
            <DropdownMenuItem
              onClick={() => setShowSuspendDialog(true)}
              className="text-yellow-400 focus:text-yellow-400 focus:bg-yellow-400/10"
            >
              <UserX className="mr-2 h-4 w-4" />
              Suspend User
            </DropdownMenuItem>
          )}
          
          {(isSuspended || isPending) && (
            <DropdownMenuItem
              onClick={handleActivate}
              className="text-green-400 focus:text-green-400 focus:bg-green-400/10"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Activate User
            </DropdownMenuItem>
          )}

          {/* Admin Toggle - only for non-self users */}
          {!isSelf && (
            <>
              <DropdownMenuSeparator className="bg-white/10" />
              {user.role === "admin" ? (
                <DropdownMenuItem
                  onClick={handleRemoveAdmin}
                  className="text-[#DA70D6] focus:text-[#DA70D6] focus:bg-[#DA70D6]/10"
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Remove Admin
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={handleMakeAdmin}
                  className="text-[#DA70D6] focus:text-[#DA70D6] focus:bg-[#DA70D6]/10"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Make Admin
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* Delete Action */}
          {!isSelf && (
            <>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-400 focus:text-red-400 focus:bg-red-400/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </DropdownMenuItem>
            </>
          )}

          {/* Self indicator */}
          {isSelf && (
            <DropdownMenuItem
              disabled
              className="text-[#EAEAEA]/50 cursor-not-allowed"
            >
              This is your account
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Suspend Confirmation Dialog */}
      <ConfirmationDialog
        open={showSuspendDialog}
        onClose={() => setShowSuspendDialog(false)}
        onConfirm={handleSuspend}
        title="Suspend User"
        description={
          <>
            Are you sure you want to suspend <strong>{user.username}</strong>? 
            They will lose access to their account and all shared credentials.
          </>
        }
        confirmText="Suspend User"
        variant="warning"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete User"
        description={
          <div className="space-y-2">
            <p>This action cannot be undone. This will permanently:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Delete the user account for <strong>{user.username}</strong></li>
              <li>Remove all their Overwatch accounts</li>
              <li>Revoke all shared access permissions</li>
              <li>Delete all associated data</li>
            </ul>
            <p className="mt-3 text-red-400 font-medium">Are you absolutely sure?</p>
          </div>
        }
        confirmText="Delete Permanently"
        variant="destructive"
      />
    </>
  )
}