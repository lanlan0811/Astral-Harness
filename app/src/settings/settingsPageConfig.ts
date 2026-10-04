export interface SettingsSection {
  id: string;
  labelKey: string;
  icon: string;
  group: "basics" | "agentCapabilities" | "dataAndStats";
  description?: string;
}

export const SETTINGS_GROUPS: Array<{ id: SettingsSection["group"]; labelKey: string }> = [
  { id: "basics", labelKey: "settings.group.basics" },
  { id: "agentCapabilities", labelKey: "settings.group.agentCapabilities" },
  { id: "dataAndStats", labelKey: "settings.group.dataAndStats" },
];

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "general", labelKey: "settings.general.title", icon: "settings", group: "basics" },
  { id: "appearance", labelKey: "settings.appearance.title", icon: "palette", group: "basics" },
  { id: "modelProvider", labelKey: "settings.modelProvider.title", icon: "package", group: "basics" },
  { id: "shortcuts", labelKey: "settings.shortcuts.title", icon: "keyboard", group: "basics" },
  { id: "browser", labelKey: "settings.browser.title", icon: "globe", group: "basics" },
  { id: "workspaceFileSearch", labelKey: "settings.workspaceFileSearch.title", icon: "fileSearch", group: "basics" },

  { id: "subagents", labelKey: "settings.subagents.title", icon: "bot", group: "agentCapabilities" },
  { id: "mcp", labelKey: "settings.mcp.title", icon: "cable", group: "agentCapabilities" },
  { id: "skills", labelKey: "settings.skills.title", icon: "wand", group: "agentCapabilities" },
  { id: "commands", labelKey: "settings.commands.title", icon: "terminal", group: "agentCapabilities" },
  { id: "automations", labelKey: "settings.automations.title", icon: "alarm", group: "agentCapabilities" },

  { id: "usage", labelKey: "settings.usage.title", icon: "chart", group: "dataAndStats" },
];

export const DEFAULT_SETTINGS_SECTION_ID = "general";

export function findSettingsSection(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((section) => section.id === id);
}

export function sectionsInGroup(group: SettingsSection["group"]): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((section) => section.group === group);
}