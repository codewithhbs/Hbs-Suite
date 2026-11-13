import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";
import { QA_PASS_SCORE, DUPLICATE_THRESHOLD } from "@/lib/constants";
import {
  FEATURE_KEYS,
  FEATURE_LABEL,
  LIMIT_KEYS,
  LIMIT_LABEL,
  isUnlimited,
} from "@/lib/saas/constants";
import { AccountForm } from "@/components/account-form";

import { AppearanceCard } from "@/components/appearance-card";
import { BrandCard } from "@/components/brand-card";

export default function SettingsPage() {
  useTitle("Settings");
  const ctx = useWorkspace();
  const ai = ctx.aiProvider;
  const storage = ctx.storage;
  const gmb = ctx.gmbProvider;
  const { data, error, loading } = usePageData("/api/views/settings");
  if (!data) return <PageState loading={loading} error={error} />;
  const users = data.users;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your profile, workspace details and what your plan currently allows.
        </p>
      </div>

      <AccountForm
        user={{ name: ctx.session.name, email: ctx.session.email }}
        tenant={ctx.tenant}
        canEditWorkspace={ctx.can("settings.edit")}
      />

      {ctx.can("settings.view") ? <BrandCard canEdit={ctx.can("settings.edit")} /> : null}
      {ctx.can("settings.view") ? <AppearanceCard canEdit={ctx.can("settings.edit")} /> : null}
      {ctx.can("settings.view") ? (
        <>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Plan limits"
            subtitle={`${ctx.plan?.name || "No plan"} · ${ctx.ent.status}`}
          />
          <CardBody className="space-y-1.5 text-sm">
            {LIMIT_KEYS.map((k) => (
              <Row
                key={k}
                label={LIMIT_LABEL[k]}
                value={
                  isUnlimited(ctx.limits[k])
                    ? "Unlimited"
                    : String(ctx.limits[k])
                }
              />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Features"
            subtitle="Enabled by your plan or by the platform admin"
          />
          <CardBody className="space-y-1.5 text-sm">
            {FEATURE_KEYS.map((k) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {FEATURE_LABEL[k]}
                </span>
                <Badge tone={ctx.features[k] ? "emerald" : "slate"}>
                  {ctx.features[k] ? "On" : "Off"}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Workflow rules" />
          <CardBody className="space-y-1.5 text-sm">
            <Row label="QA pass score" value={`${QA_PASS_SCORE} / 100`} />
            <Row
              label="Duplicate threshold"
              value={`${(DUPLICATE_THRESHOLD * 100).toFixed(0)}% similarity`}
            />
            <Row
              label="Auto publish"
              value={
                ctx.features.f_auto_publish
                  ? "Allowed by plan"
                  : "Disabled - a human approves every post"
              }
            />
            <Row label="AI provider" value={`${ai.name} / ${ai.textModel}`} />
            <Row label="Image storage" value={storage.primary} />
            <Row
              label="GMB provider"
              value={`${gmb.name}${gmb.isMock ? " (mock)" : ""}`}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Workspace users"
            subtitle={`${users.length} of ${isUnlimited(ctx.limits.max_team_members) ? "unlimited" : ctx.limits.max_team_members}`}
          />
          <CardBody className="space-y-2 text-sm">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-800 dark:text-zinc-100">{u.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {u.email}
                  </p>
                </div>
                <Badge tone={u.role === "OWNER" ? "indigo" : "slate"}>
                  {u.role}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
        </>
      ) : null}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="truncate text-right font-mono text-xs text-zinc-800 dark:text-zinc-100">
        {value}
      </span>
    </div>
  );
}
