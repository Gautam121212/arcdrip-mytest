// Run inside a clone of your fork of stripe/openapi:
//   node ~/arcdrip-mytest/scripts/break-spec.mjs
// Makes four edits to openapi/spec3.json. Three touch fields billing.ts reads;
// one (the control) touches a field nobody reads and must produce no alert.
import { readFileSync, writeFileSync } from "node:fs";

const file = "openapi/spec3.json";
const spec = JSON.parse(readFileSync(file, "utf8"));
const s = spec.components.schemas;

// 1. FIELD_REMOVED — customerSummary() reads customer.email
delete s.customer.properties.email;
s.customer.required = (s.customer.required ?? []).filter((r) => r !== "email");

// 2. ENUM_VALUE_REMOVED — handleWebhook() and startPlan() read subscription.status
s.subscription.properties.status.enum = s.subscription.properties.status.enum.filter((v) => v !== "trialing");

// 3. FIELD_TYPE_CHANGED — handleWebhook() reads invoice.amount_paid as a number
s.invoice.properties.amount_paid.type = "string";

// 4. CONTROL — nothing in billing.ts reads customer.phone; expect NO alert for this
delete s.customer.properties.phone;
s.customer.required = (s.customer.required ?? []).filter((r) => r !== "phone");

// Mark the edited spec so alerts show a distinguishable version pair.
spec.info.version = `${spec.info.version}-mytest`;

writeFileSync(file, JSON.stringify(spec, null, 2) + "\n");
console.log("edited: customer.email removed, subscription.status lost 'trialing', invoice.amount_paid -> string, customer.phone removed (control)");
