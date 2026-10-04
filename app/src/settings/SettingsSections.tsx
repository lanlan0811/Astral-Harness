import * as React from "react";
import { useIntl } from "../i18n";
import { useAppDispatch, useAppState, useThemeActions, useThemeState } from "../store/AppStore";
import type { ThemePreference } from "../theme/theme";
import { cn } from "../lib/cn";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { SettingsGroupCard, SettingsRow, SettingsSectionHeading, SettingsSubheading } from "./SettingsParts";
import { ShortcutSettings } from "./ShortcutSettings";
import { MOCK_PROVIDERS } from "../mock/data";
import { SETTINGS_SECTIONS } from "./settingsPageConfig";

export function SettingsContent({ sectionId }: { sectionId: string }) {
  switch (sectionId) {
    case "general":
      return <GeneralSection />;
    case "appearance":
      return <AppearanceSection />;
    case "modelProvider":
      return <ModelProviderSection />;
    case "shortcuts":
      return <ShortcutSettings />;
    default:
      return <PlaceholderSection sectionId={sectionId} />;
  }
}

function GeneralSection() {
  const intl = useIntl();
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { localePreference, setLocalePreference } = intl;
  const [interfaceMode, setInterfaceMode] = React.useState("coding");

  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeading
        title={intl.formatMessage({ id: "settings.general.title" })}
        description={intl.formatMessage({ id: "settings.general.description" })}
      />

      <SettingsGroupCard>
        <SettingsRow
          label={intl.formatMessage({ id: "settings.locale" })}
          description={intl.formatMessage({ id: "settings.localeDescription" })}
        >
          <Select value={localePreference} onValueChange={(value) => setLocalePreference(value as typeof localePreference)}>
            <SelectTrigger size="lg" className="w-full min-w-0 justify-between">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">{intl.formatMessage({ id: "locale.system" })}</SelectItem>
              <SelectItem value="zh-CN">{intl.formatMessage({ id: "locale.zh-CN" })}</SelectItem>
              <SelectItem value="en-US">{intl.formatMessage({ id: "locale.en-US" })}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow
          wide
          label={intl.formatMessage({ id: "settings.interfaceMode" })}
          description={intl.formatMessage({ id: "settings.interfaceModeDescription" })}
        >
          <Select value={interfaceMode} onValueChange={setInterfaceMode}>
            <SelectTrigger className="w-64 justify-between">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="coding">{intl.formatMessage({ id: "settings.interfaceMode.coding" })}</SelectItem>
              <SelectItem value="office">{intl.formatMessage({ id: "settings.interfaceMode.office" })}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsGroupCard>

      <div className="flex flex-col gap-4">
        <SettingsSubheading title={intl.formatMessage({ id: "terminal.title" })} />
        <SettingsGroupCard>
          <SettingsTextLikeRow label={intl.formatMessage({ id: "settings.integratedTerminalShell" })}>
            <Select defaultValue="auto">
              <SelectTrigger className="justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="bash">bash</SelectItem>
                <SelectItem value="pwsh">pwsh</SelectItem>
                <SelectItem value="zsh">zsh</SelectItem>
              </SelectContent>
            </Select>
          </SettingsTextLikeRow>
        </SettingsGroupCard>
      </div>

      <div className="flex flex-col gap-4">
        <SettingsSubheading title={intl.formatMessage({ id: "chat.statusPanel.git" })} />
        <SettingsGroupCard>
          <SettingsSwitchRow
            label={intl.formatMessage({ id: "settings.showReasoning" })}
            checked={state.showReasoning}
            onCheckedChange={(value) => dispatch({ type: "display/setShowReasoning", value })}
          />
          <SettingsSwitchRow
            label={intl.formatMessage({ id: "settings.showTodos" })}
            checked={state.showTodos}
            onCheckedChange={(value) => dispatch({ type: "display/setShowTodos", value })}
          />
        </SettingsGroupCard>
      </div>
    </div>
  );
}

function AppearanceSection() {
  const intl = useIntl();
  const theme = useThemeState();
  const { setThemePreference, setUiFontSizePx } = useThemeActions();
  const [draftFontSize, setDraftFontSize] = React.useState(String(theme.uiFontSizePx));

  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeading
        title={intl.formatMessage({ id: "settings.appearance.title" })}
        description={intl.formatMessage({ id: "settings.appearance.description" })}
      />

      <div className="flex flex-col gap-4">
        <SettingsSubheading
          title={intl.formatMessage({ id: "settings.appearance.interfaceTitle" })}
          description={intl.formatMessage({ id: "settings.appearance.interfaceDescription" })}
        />
        <SettingsGroupCard>
          <SettingsRow
            label={intl.formatMessage({ id: "settings.themeMode" })}
            description={intl.formatMessage({ id: "settings.themeModeDescription" })}
          >
            <Select value={theme.preference} onValueChange={(value) => setThemePreference(value as ThemePreference)}>
              <SelectTrigger size="lg" className="w-full min-w-0 justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">{intl.formatMessage({ id: "theme.system" })}</SelectItem>
                <SelectItem value="astral-dark">{intl.formatMessage({ id: "theme.dark" })}</SelectItem>
                <SelectItem value="astral-light">{intl.formatMessage({ id: "theme.light" })}</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow label={intl.formatMessage({ id: "settings.uiFontSize" })}>
            <div className="relative w-28">
              <Input
                value={draftFontSize}
                inputMode="numeric"
                onChange={(event) => setDraftFontSize(event.target.value)}
                onBlur={() => setUiFontSizePx(Number(draftFontSize))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setUiFontSizePx(Number(draftFontSize));
                  if (event.key === "Escape") setDraftFontSize(String(theme.uiFontSizePx));
                }}
                className="pr-8 text-right tabular-nums"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-ui-lg text-foreground-subtle">
                px
              </span>
            </div>
          </SettingsRow>
        </SettingsGroupCard>
      </div>

      <div className="flex flex-col gap-4">
        <SettingsSubheading
          title={intl.formatMessage({ id: "settings.appearance.codeTitle" })}
          description={intl.formatMessage({ id: "settings.appearance.codeDescription" })}
        />
        <CodePreviewSample />
      </div>
    </div>
  );
}

function CodePreviewSample() {
  const intl = useIntl();
  const theme = useThemeState();

  const sample = `export async function ensureFreshToken(): Promise<string | null> {
  const token = store.read();
  if (!token) return null;
  const refreshed = await refresh(token.refreshUrl);
  if (!refreshed) return null;
  return refreshed;
}`;

  return (
    <div className="flex flex-col gap-4">
      <SettingsGroupCard>
        <SettingsRow label={intl.formatMessage({ id: "settings.showLineNumbers" })}>
          <Switch defaultChecked={theme.showLineNumbers} />
        </SettingsRow>
        <SettingsRow label={intl.formatMessage({ id: "settings.wrapLongLines" })}>
          <Switch defaultChecked={theme.wrapLongLines} />
        </SettingsRow>
      </SettingsGroupCard>

      <div>
        <SettingsSubheading
          title={intl.formatMessage({ id: "settings.appearance.previewTitle" })}
          description={intl.formatMessage({ id: "settings.appearance.previewDescription" })}
        />
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-ui-base font-semibold text-foreground">{intl.formatMessage({ id: "settings.appearance.previewTitle" })}</p>
              <p className="text-ui-base text-foreground-subtle">{theme.darkCodeTheme}</p>
            </div>
            <span className="rounded-md bg-surface px-2.5 py-1 text-ui-xs font-medium text-foreground-subtle">
              {intl.formatMessage({ id: "settings.preview.active" })}
            </span>
          </div>
          <pre className="p-3 font-mono text-ui-sm leading-6">
            <code>{sample}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

function ModelProviderSection() {
  const intl = useIntl();
  const [selected, setSelected] = React.useState("astral");
  const provider = MOCK_PROVIDERS.find((item) => item.id === selected) ?? MOCK_PROVIDERS[0];

  return (
    <div className="flex flex-col gap-4">
      <SettingsSectionHeading
        title={intl.formatMessage({ id: "settings.modelProvider.title" })}
        description={intl.formatMessage({ id: "settings.modelProvider.description" })}
      />

      <div className="flex items-start justify-between gap-3">
        <Button variant="default" size="lg">
          {intl.formatMessage({ id: "settings.modelProvider.add" })}
        </Button>
      </div>

      <div className="grid min-h-[36rem] grid-cols-[56px_minmax(0,1fr)] overflow-clip rounded-xl border border-border bg-card md:grid-cols-[224px_minmax(0,1fr)]">
        <div className="min-w-0 border-r border-border px-1.5 py-3 md:px-2 md:py-2">
          {MOCK_PROVIDERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item.id)}
              className={cn(
                "flex h-8 w-full max-md:size-8 max-md:justify-center items-center gap-2 rounded-lg border px-2 text-left text-ui-base font-medium transition-colors",
                item.id === selected
                  ? "border-border-hover bg-card-selected text-foreground"
                  : "border-transparent text-foreground hover:border-border-hover/60",
              )}
            >
              <span className="max-md:hidden">{item.name}</span>
            </button>
          ))}
        </div>

        <div className="relative min-w-0 p-4 pb-20 sm:p-6 sm:pb-24">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-ui-lg font-semibold text-foreground">{provider.name}</span>
          </div>
          <SettingsGroupCard>
            <SettingsRow label={intl.formatMessage({ id: "settings.modelProvider.apiKey" })}>
              <Input
                type={provider.hasKey ? "password" : "text"}
                placeholder={intl.formatMessage({ id: "settings.modelProvider.apiKeyPlaceholder" })}
                className="w-full"
              />
            </SettingsRow>
            <SettingsRow label={intl.formatMessage({ id: "settings.modelProvider.baseUrl" })}>
              <Input placeholder="https://api.example.com/v1" className="w-full" />
            </SettingsRow>
          </SettingsGroupCard>

          <div className="mt-4 flex flex-col gap-2">
            {provider.models.map((model) => (
              <div key={model.id} className="flex h-8 items-center gap-2 rounded-lg px-2 text-ui-base">
                <span className="min-w-0 flex-1 truncate text-foreground">{model.name}</span>
                <span className="shrink-0 text-ui-xs text-foreground-subtle">default</span>
              </div>
            ))}
            <button className="flex h-12 items-center gap-2 rounded-lg border border-dashed border-border px-4 text-left text-ui-base text-foreground-subtle">
              {intl.formatMessage({ id: "settings.modelProvider.addModel" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderSection({ sectionId }: { sectionId: string }) {
  const intl = useIntl();
  const section = SETTINGS_SECTIONS.find((item) => item.id === sectionId);

  return (
    <div>
      <SettingsSectionHeading
        title={section ? intl.formatMessage({ id: section.labelKey }) : sectionId}
        description={section ? intl.formatMessage({ id: `${section.labelKey}.description` }) : undefined}
      />
      <SettingsGroupCard>
        <SettingsRow label={intl.formatMessage({ id: "settings.notImplemented" })}>
          <span className="text-ui-sm text-foreground-subtle">{intl.formatMessage({ id: "statusBar.previewOnly" })}</span>
        </SettingsRow>
      </SettingsGroupCard>
    </div>
  );
}

function SettingsTextLikeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <SettingsRow label={label}>
      {children}
    </SettingsRow>
  );
}

function SettingsSwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked?: boolean;
  onCheckedChange?: (value: boolean) => void;
}) {
  return (
    <SettingsRow label={label}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </SettingsRow>
  );
}
