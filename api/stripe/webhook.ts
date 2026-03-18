import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { supabaseAdmin } from '../_lib/auth'
import { buffer } from 'micro'

export const config = { api: { bodyParser: false } }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-01-27.acacia' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' })

  let event: Stripe.Event
  try {
    const rawBody = await buffer(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[Stripe Webhook] signature error:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (!userId || !session.subscription) break

        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        await upsertSubscription(sub, userId)
        await supabaseAdmin.from('profiles').update({ tier: 'pro' }).eq('id', userId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = await getUserIdFromCustomer(sub.customer as string)
        if (!userId) break

        await upsertSubscription(sub, userId)
        // Downgrade if subscription is not active
        if (!['active', 'trialing'].includes(sub.status)) {
          await supabaseAdmin.from('profiles').update({ tier: 'free' }).eq('id', userId)
        } else {
          await supabaseAdmin.from('profiles').update({ tier: 'pro' }).eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = await getUserIdFromCustomer(sub.customer as string)
        if (!userId) break

        await supabaseAdmin.from('subscriptions').update({ status: 'canceled' }).eq('id', sub.id)
        await supabaseAdmin.from('profiles').update({ tier: 'free' }).eq('id', userId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.subscription) break
        await supabaseAdmin.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('id', invoice.subscription as string)
        break
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] handler error:', err)
  }

  return res.json({ received: true })
}

async function upsertSubscription(sub: Stripe.Subscription, userId: string) {
  await supabaseAdmin.from('subscriptions').upsert({
    id: sub.id,
    user_id: userId,
    status: sub.status,
    price_id: sub.items.data[0]?.price.id ?? '',
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  })
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()
  return data?.id ?? null
}
