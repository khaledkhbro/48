"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Clock, AlertTriangle } from "lucide-react"

interface ExtensionRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (days: number, reason: string) => void
  loading: boolean
  orderTitle: string
}

export function ExtensionRequestDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
  orderTitle,
}: ExtensionRequestDialogProps) {
  const [days, setDays] = useState<number>(1)
  const [reason, setReason] = useState("")

  const handleSubmit = () => {
    if (days > 0 && reason.trim()) {
      onSubmit(days, reason.trim())
    }
  }

  const handleClose = () => {
    setDays(1)
    setReason("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-blue-600" />
            Request Extension
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800 font-medium">Order: {orderTitle}</p>
            <p className="text-xs text-blue-600 mt-1">Request additional time from the buyer to complete this order</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Additional Days Needed</label>
            <Input
              type="number"
              min="1"
              max="14"
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(14, Number.parseInt(e.target.value) || 1)))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum 14 days extension allowed</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Reason for Extension</label>
            <Textarea
              placeholder="Explain why you need additional time (e.g., project complexity, technical challenges, additional research needed)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">Be specific and professional - this will be sent to the buyer</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-800">
                <p className="font-medium mb-1">Important:</p>
                <ul className="space-y-1">
                  <li>• The buyer can approve or reject your request</li>
                  <li>• If approved, your deadline will be extended</li>
                  <li>• If rejected, the original deadline remains</li>
                  <li>• You can only request one extension per order</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason.trim() || days < 1 || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Request {days} Day{days !== 1 ? "s" : ""} Extension
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
