// Payment escrow system for secure job transactions - DISABLED
import type { WalletTransaction } from "./wallet"

export interface EscrowTransaction {
  id: string
  jobId: string
  applicationId: string
  workProofId?: string
  payerId: string
  payeeId: string
  amount: number
  status: "locked" | "released" | "refunded" | "disputed" | "auto_released"
  lockedAt: string
  releaseScheduledAt: string
  releasedAt?: string
  refundedAt?: string
  disputeId?: string
  description: string
  metadata?: {
    jobTitle: string
    workerName: string
    employerName: string
  }
  createdAt: string
  updatedAt: string
}

export async function createEscrowTransaction(data: {
  jobId: string
  applicationId: string
  payerId: string
  payeeId: string
  amount: number
  jobTitle: string
  workerName: string
  employerName: string
}): Promise<EscrowTransaction> {
  throw new Error("Escrow functionality has been disabled")
}

export async function releaseEscrowPayment(
  escrowId: string,
  workProofId?: string,
): Promise<{ escrowTransaction: EscrowTransaction; walletTransaction: WalletTransaction }> {
  throw new Error("Escrow functionality has been disabled")
}

export async function refundEscrowPayment(
  escrowId: string,
  reason: string,
): Promise<{ escrowTransaction: EscrowTransaction; walletTransaction: WalletTransaction }> {
  throw new Error("Escrow functionality has been disabled")
}

export async function processAutoReleases(): Promise<EscrowTransaction[]> {
  return []
}

export async function getEscrowTransactionsByUser(userId: string): Promise<EscrowTransaction[]> {
  return []
}

export async function getEscrowTransactionByJob(jobId: string): Promise<EscrowTransaction | null> {
  return null
}

export const getEscrowStatusColor = (status: EscrowTransaction["status"]) => {
  return "bg-gray-100 text-gray-800"
}

export const formatTimeRemaining = (releaseScheduledAt: string): string => {
  return "Escrow disabled"
}
