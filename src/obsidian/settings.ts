import { App, PluginSettingTab, Setting, Plugin } from "obsidian";

export interface TILSettings {
	shellPath: string;
	autoLaunchClaude: boolean;
	resumeLastSession: boolean;
	fontSize: number;
	fontFamily: string;
	lineHeight: number;
	tilPath: string;
	autoOpenNewTIL: boolean;
	openDashboardOnStartup: boolean;
	claudeArgs: string;
	mcpEnabled: boolean;
	mcpPort: number;
}

export const DEFAULT_SETTINGS: TILSettings = {
	shellPath: process.platform === "win32"
		? "powershell.exe"
		: process.env.SHELL || "/bin/zsh",
	autoLaunchClaude: true,
	resumeLastSession: false,
	fontSize: 13,
	fontFamily: 'Menlo, Monaco, "Courier New", monospace',
	lineHeight: 1.0,
	tilPath: "til",
	autoOpenNewTIL: true,
	openDashboardOnStartup: false,
	claudeArgs: "",
	mcpEnabled: true,
	mcpPort: 22360,
};

export class TILSettingTab extends PluginSettingTab {
	private plugin: Plugin & { settings: TILSettings; saveSettings(): Promise<void> };

	constructor(app: App, plugin: Plugin & { settings: TILSettings; saveSettings(): Promise<void> }) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Shell path")
			.setDesc("Path to the shell executable used in the terminal")
			.addText((text) =>
				text
					.setPlaceholder("/bin/zsh")
					.setValue(this.plugin.settings.shellPath)
					.onChange(async (value) => {
						this.plugin.settings.shellPath = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-launch Claude")
			.setDesc("Automatically launch Claude Code when the terminal panel opens")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoLaunchClaude)
					.onChange(async (value) => {
						this.plugin.settings.autoLaunchClaude = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Resume last session")
			.setDesc("Resume the previous Claude Code session when the terminal starts")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.resumeLastSession)
					.onChange(async (value) => {
						this.plugin.settings.resumeLastSession = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Additional Claude arguments")
			.setDesc("Extra CLI arguments to pass when launching Claude Code (e.g. --model sonnet --verbose)")
			.addText((text) =>
				text
					.setPlaceholder("--model sonnet")
					.setValue(this.plugin.settings.claudeArgs)
					.onChange(async (value) => {
						this.plugin.settings.claudeArgs = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Font size")
			.setDesc("Terminal font size in pixels")
			.addSlider((slider) =>
				slider
					.setLimits(10, 24, 1)
					.setValue(this.plugin.settings.fontSize)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.fontSize = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Font family")
			.setDesc("Terminal font (only system-installed fonts will work; restart the terminal after changing)")
			.addDropdown((dropdown) => {
				const presets: Record<string, string> = {
					'Menlo, Monaco, "Courier New", monospace': "Menlo (default)",
					'"SF Mono", Menlo, Monaco, monospace': "SF Mono",
					'"Fira Code", "Fira Mono", monospace': "Fira Code",
					'"JetBrains Mono", monospace': "JetBrains Mono",
					'"Source Code Pro", monospace': "Source Code Pro",
					'"Cascadia Code", "Cascadia Mono", monospace': "Cascadia Code",
					'Consolas, "Courier New", monospace': "Consolas",
					'"IBM Plex Mono", monospace': "IBM Plex Mono",
					'"D2Coding", monospace': "D2Coding",
				};
				for (const [value, label] of Object.entries(presets)) {
					dropdown.addOption(value, label);
				}
				const currentValue = this.plugin.settings.fontFamily;
				if (!(currentValue in presets)) {
					dropdown.addOption(currentValue, `Custom: ${currentValue}`);
				}
				dropdown
					.setValue(currentValue)
					.onChange(async (value) => {
						this.plugin.settings.fontFamily = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Line height")
			.setDesc("Terminal line height (1.0 = default, 1.2 = spacious)")
			.addSlider((slider) =>
				slider
					.setLimits(1.0, 2.0, 0.1)
					.setValue(this.plugin.settings.lineHeight)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.lineHeight = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("h3", { text: "TIL Settings" });

		new Setting(containerEl)
			.setName("Auto-open new TIL files")
			.setDesc("Automatically open new .md files created in the til/ folder in the editor")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoOpenNewTIL)
					.onChange(async (value) => {
						this.plugin.settings.autoOpenNewTIL = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Open dashboard on startup")
			.setDesc("Automatically show the learning dashboard when Obsidian opens")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openDashboardOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.openDashboardOnStartup = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("h3", { text: "MCP Server" });

		new Setting(containerEl)
			.setName("Enable MCP server")
			.setDesc("Run an MCP server so Claude Code can read and write vault files in real time")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.mcpEnabled)
					.onChange(async (value) => {
						this.plugin.settings.mcpEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("MCP port")
			.setDesc("MCP server port (reload Obsidian after changing)")
			.addText((text) =>
				text
					.setPlaceholder("22360")
					.setValue(String(this.plugin.settings.mcpPort))
					.onChange(async (value) => {
						const port = parseInt(value, 10);
						if (!isNaN(port) && port > 0 && port < 65536) {
							this.plugin.settings.mcpPort = port;
							await this.plugin.saveSettings();
						}
					})
			);
	}
}
