import { z } from 'zod'

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  label: z.string(),
  priority: z.string(),
  user: z.string().optional(),
  price: z.number().optional(),
  balanceBefore: z.number().nullable().optional(),
  balanceAfter: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageKey: z.string().nullable().optional(),
  imageExpiresAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
})

export type Task = z.infer<typeof taskSchema>
