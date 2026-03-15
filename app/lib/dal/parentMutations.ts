import { supabase } from "../supabase/client";
import { logger } from "../logger";
import { Database } from "../../types/database.types";

export type CreateTaskPayload = Database["public"]["Tables"]["tasks"]["Insert"];
export type PointLedgerRow = Database["public"]["Tables"]["point_ledger"]["Row"];

/**
 * Provisions a new task.
 * @security RLS ensures only is_admin=true users can insert tasks.
 * The `created_by` field must be the authenticated parent's user ID.
 */
export async function createTask(payload: CreateTaskPayload) {
    logger.info("Provisioning new task", { title: payload.title });

    try {
        const { data, error } = await supabase
            .from("tasks")
            .insert([payload])
            .select()
            .single();

        if (error) {
            logger.error("Failed to provision task", error);
            throw new Error(error.message);
        }

        return data;
    } catch (err: any) {
        logger.error("Task creation exception", err);
        throw err;
    }
}

/**
 * Updates an existing task.
 * @param taskId - UUID of the task to update.
 * @param payload - Partial task object containing fields to update.
 */
export async function updateTask(taskId: string, payload: Partial<CreateTaskPayload>) {
    logger.info("Updating task", { taskId, title: payload.title });

    try {
        const { data, error } = await supabase
            .from("tasks")
            .update(payload)
            .eq("id", taskId)
            .select()
            .single();

        if (error) {
            logger.error("Failed to update task", error);
            throw new Error(error.message);
        }

        return data;
    } catch (err: any) {
        logger.error("Task update exception", err);
        throw err;
    }
}

/**
 * Deactivates a task (soft delete).
 * @param taskId - UUID of the task to deactivate.
 */
export async function deleteTask(taskId: string) {
    logger.info("Deactivating task", { taskId });

    try {
        const { error } = await supabase
            .from("tasks")
            .update({ is_active: false })
            .eq("id", taskId);

        if (error) {
            logger.error("Failed to deactivate task", error);
            throw new Error(error.message);
        }

        return true;
    } catch (err: any) {
        logger.error("Task deactivation exception", err);
        throw err;
    }
}

/**
 * Executes a Ledger Undo operation securely.
 * CRITICAL CONSTRAINT: We NEVER run DELETE operations on the ledger.
 * Instead, we insert a compensatory transaction with transaction_type='undo'
 * and the mathematical inverse of the target transaction's point_delta.
 *
 * @security RLS ensures only is_admin=true users can insert ledger entries.
 * @param transactionId - The UUID of the original transaction to reverse.
 * @param currentSessionUserId - The authenticated parent's user ID (for audit trail).
 */
export async function undoLedgerTransaction(transactionId: string, currentSessionUserId: string) {
    logger.info("Attempting Ledger Undo", { transactionId });

    try {
        // Step 1: Fetch the original transaction to verify it exists and hasn't been undone
        const { data: originalTx, error: fetchError } = await supabase
            .from("point_ledger")
            .select("*")
            .eq("id", transactionId)
            .single();

        if (fetchError || !originalTx) {
            throw new Error("Target transaction not found.");
        }

        if (originalTx.notes?.startsWith("Undo: ")) {
            throw new Error("Cannot undo an undo transaction.");
        }

        const { data: existingUndo } = await supabase
            .from("point_ledger")
            .select("id")
            .eq("transaction_type", "undo")
            .ilike("notes", `%${transactionId}%`)
            .maybeSingle();

        if (existingUndo) {
            throw new Error("Transaction has already been undone.");
        }

        // Step 2: Forge the compensatory row (mathematical inverse)
        const compensatoryRow: Database["public"]["Tables"]["point_ledger"]["Insert"] = {
            child_id: originalTx.child_id,
            point_delta: -(originalTx.point_delta),
            transaction_type: "undo",
            notes: `Undo: ${originalTx.notes || "Transaction"} (${transactionId})`
        };

        const { data: newTx, error: insertError } = await supabase
            .from("point_ledger")
            .insert(compensatoryRow)
            .select()
            .single();

        if (insertError) {
            throw new Error(`Failed to commit undo: ${insertError.message}`);
        }

        logger.info("Ledger Undo successful", { newTxId: newTx.id });
        return newTx;

    } catch (err: any) {
        logger.error("Undo sequence failed", err);
        throw err;
    }
}
