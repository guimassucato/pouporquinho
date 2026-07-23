import { createClient } from "@/lib/supabase/server";
import { PaymentMethodsClient } from "./payment-methods-client";

export default async function PaymentMethodsPage() {
  const supabase = await createClient();
  const { data: paymentMethods } = await supabase
    .from("payment_methods")
    .select("*")
    .order("name");

  return <PaymentMethodsClient paymentMethods={paymentMethods ?? []} />;
}
