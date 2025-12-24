import PlanForm from "@/components/plan/planForm";
import { SUBSCRIPTION_PLANS } from "@/constants/subscriptionPlans";
import { notFound } from "next/navigation";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const plan = SUBSCRIPTION_PLANS.find((x) => x.id === id);
  if (!plan) return notFound();
  return <PlanForm plan={plan} />;
};

export default page;
