import SubscriptionLayout from "@/features/subscription/SubscriptionLayout";
import SubscriptionDetails from "@/features/subscription/SubscriptionDetails";

export default function MySubscription() {
  return <SubscriptionLayout>
    <p className="text-sm font-bold text-[#A61E25]">الحساب</p>
    <h1 className="mt-2 text-3xl font-bold sm:text-4xl">اشتراكي</h1>
    <p className="mb-7 mt-3 leading-7 text-muted-foreground">مساحتك لمعرفة تفاصيل تجربتك.</p>
    <SubscriptionDetails snapshot={null} />
  </SubscriptionLayout>;
}
