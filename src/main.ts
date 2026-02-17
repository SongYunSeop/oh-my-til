import { Plugin } from "obsidian";
import { TerminalView, VIEW_TYPE_TIL_TERMINAL } from "./terminal/TerminalView";
import { TILSettingTab, DEFAULT_SETTINGS } from "./settings";
import type { TILSettings } from "./settings";
import { TILWatcher } from "./watcher";
import { installSkills } from "./skills";

export default class TILPlugin extends Plugin {
	settings: TILSettings = DEFAULT_SETTINGS;
	private watcher: TILWatcher | null = null;

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_TIL_TERMINAL,
			(leaf) => new TerminalView(leaf, this.settings)
		);

		this.addCommand({
			id: "open-til-terminal",
			name: "터미널 열기",
			callback: () => {
				this.openTerminal();
			},
		});

		this.addSettingTab(new TILSettingTab(this.app, this));

		// skill 자동 설치 (.claude/skills/ 에 없으면 복사)
		installSkills(this.app.vault);

		// 파일 watcher 시작
		if (this.settings.autoOpenNewTIL) {
			this.watcher = new TILWatcher(this.app, this.settings.tilPath);
			this.watcher.start();
		}
	}

	onunload() {
		this.watcher?.stop();
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_TIL_TERMINAL);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// watcher 상태 동기화
		if (this.settings.autoOpenNewTIL) {
			if (!this.watcher) {
				this.watcher = new TILWatcher(this.app, this.settings.tilPath);
				this.watcher.start();
			} else {
				this.watcher.updatePath(this.settings.tilPath);
			}
		} else {
			this.watcher?.stop();
			this.watcher = null;
		}
	}

	private async openTerminal(): Promise<TerminalView | null> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_TIL_TERMINAL);
		if (existing.length > 0) {
			await this.app.workspace.revealLeaf(existing[0]!);
			return existing[0]!.view as TerminalView;
		}

		const rightLeaf = this.app.workspace.getRightLeaf(false);
		if (rightLeaf) {
			await rightLeaf.setViewState({
				type: VIEW_TYPE_TIL_TERMINAL,
				active: true,
			});
			await this.app.workspace.revealLeaf(rightLeaf);
			return rightLeaf.view as TerminalView;
		}
		return null;
	}
}
