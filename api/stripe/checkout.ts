import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { getAuthUser, supabaseAdmin } from '../_lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-01-27.acacia' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getAuthUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  // Find or create Stripe customer
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email,
      metadata: { supabase_uid: user.id },
    })
    customerId = customer.id
    await supabaseAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const origin = req.headers.origin ?? process.env.VITE_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancel`,
    metadata: { userId: user.id },
    allow_promotion_codes: true,
    subscription_data: { trial_period_days: 7 },
  })

  return res.json({ url: session.url })
}
