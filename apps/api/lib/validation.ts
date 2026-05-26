import { z } from "zod";

export const walletInput = z.object({
  name: z.string().min(1).max(80),
  type: z.string().min(1).max(40).default("cash"),
  currency: z.string().min(3).max(3).default("IDR"),
  balance: z.coerce.number().default(0),
  color: z.string().min(4).max(24).default("#2563eb")
});

export const categoryInput = z.object({
  name: z.string().min(1).max(80),
  icon: z.string().min(1).max(40).default("tag"),
  color: z.string().min(4).max(24).default("#64748b"),
  kind: z.enum(["income", "expense"]).default("expense")
});

export const budgetInput = z.object({
  name: z.string().min(1).max(80),
  amount: z.coerce.number().positive(),
  period: z.enum(["daily", "weekly", "monthly"]).default("monthly"),
  startsOn: z.string().date(),
  categoryId: z.string().uuid().nullable().optional()
});

export const transactionInput = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    amount: z.coerce.number().positive(),
    walletId: z.string().uuid(),
    targetWalletId: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    budgetId: z.string().uuid().nullable().optional(),
    note: z.string().max(240).nullable().optional(),
    happenedAt: z.string().datetime().optional()
  })
  .refine((data) => data.type !== "transfer" || !!data.targetWalletId, {
    message: "targetWalletId is required for transfer transactions",
    path: ["targetWalletId"]
  })
  .refine((data) => data.type !== "transfer" || data.walletId !== data.targetWalletId, {
    message: "target wallet must be different",
    path: ["targetWalletId"]
  });
