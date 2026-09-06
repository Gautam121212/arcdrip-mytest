// A small, realistic billing module. arcdrip will be told exactly which of
// these fields it depends on, and we will break some of them on purpose.
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2026-08-26.dahlia" });

/** Profile card in the account page. Reads: customer.email, customer.invoice_settings.default_payment_method */
export async function customerSummary(customerId: string) {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return {
    email: customer.email,
    paymentMethod: customer.invoice_settings.default_payment_method,
  };
}

/** Checkout success handler. Reads: subscription.id, subscription.status, subscription.latest_invoice */
export async function startPlan(customerId: string, priceId: string) {
  const sub = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    metadata: { source: "arcdrip-mytest" },
  });
  return { id: sub.id, status: sub.status, invoice: sub.latest_invoice };
}

/** Webhook endpoint. Reads: subscription.status, subscription.cancel_at_period_end, invoice.amount_paid, invoice.hosted_invoice_url */
export function handleWebhook(payload: Buffer, signature: string) {
  const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  switch (event.type) {
    case "customer.subscription.updated": {
      const sub = event.data.object;
      return { kind: "subscription", status: sub.status, endsAtPeriodEnd: sub.cancel_at_period_end };
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      return { kind: "invoice", paid: invoice.amount_paid, receipt: invoice.hosted_invoice_url };
    }
    default:
      return null;
  }
}
