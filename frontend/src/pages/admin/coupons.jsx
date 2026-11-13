import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { CouponManager } from "@/components/admin/coupon-manager";

export default function AdminCouponsPage() {
  useTitle("Coupons");
  const { data, error, loading } = usePageData("/api/views/admin/coupons");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Coupons</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Discounts applied when a subscription or credit-pack invoice is raised.</p>
      </div>
      {data ? (
        <CouponManager coupons={data.coupons} plans={data.plans} />
      ) : (
        <PageState loading={loading} error={error} />
      )}
    </div>
  );
}
