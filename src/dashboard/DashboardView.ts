import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import { computeBacklogProgress, parseBacklogItems } from "../backlog";
import { extractCategory } from "../mcp/context";
import {
	computeEnhancedStats,
	selectRecentTils,
	extractSummary,
	pickRandomReviewItems,
	type EnhancedStatsFileEntry,
	type EnhancedTILStats,
	type BacklogProgressEntry,
	type SummaryCards,
	type HeatmapData,
	type EnhancedCategory,
	type DashboardBacklogProgress,
	type RandomReviewPick,
} from "./stats";

export const VIEW_TYPE_TIL_DASHBOARD = "claude-til-dashboard-view";

export class DashboardView extends ItemView {
	private tilPath: string;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private static readonly DEBOUNCE_MS = 500;
	private reviewSectionEl: HTMLElement | null = null;
	private cachedFiles: EnhancedStatsFileEntry[] = [];
	private cachedIncompleteBacklogItems: Array<{ displayName: string; path: string; category: string }> = [];

	constructor(leaf: WorkspaceLeaf, tilPath: string) {
		super(leaf);
		this.tilPath = tilPath;
	}

	getViewType(): string {
		return VIEW_TYPE_TIL_DASHBOARD;
	}

	getDisplayText(): string {
		return "TIL Dashboard";
	}

	getIcon(): string {
		return "bar-chart-2";
	}

	async onOpen(): Promise<void> {
		await this.render();

		// vault 파일 변경 시 자동 새로고침 (tilPath 하위만)
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (file.path.startsWith(this.tilPath + "/")) {
					this.scheduleRefresh();
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file.path.startsWith(this.tilPath + "/")) {
					this.scheduleRefresh();
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file.path.startsWith(this.tilPath + "/")) {
					this.scheduleRefresh();
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file) => {
				if (file.path.startsWith(this.tilPath + "/")) {
					this.scheduleRefresh();
				}
			}),
		);
	}

	async onClose(): Promise<void> {
		if (this.debounceTimer !== null) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}

	private scheduleRefresh(): void {
		if (this.debounceTimer !== null) {
			clearTimeout(this.debounceTimer);
		}
		this.debounceTimer = setTimeout(() => {
			this.debounceTimer = null;
			this.render();
		}, DashboardView.DEBOUNCE_MS);
	}

	async render(): Promise<void> {
		const raw = this.containerEl.children[1];
		if (!raw) return;
		const container = raw as HTMLElement;
		container.empty();
		container.addClass("claude-til-dashboard");

		const content = container.createDiv({ cls: "claude-til-dashboard-content" });

		const files: EnhancedStatsFileEntry[] = this.app.vault.getFiles()
			.filter((f) => f.extension === "md")
			.map((f) => {
				const cache = this.app.metadataCache.getFileCache(f);
				const fmDate = cache?.frontmatter?.date;
				const createdDate = typeof fmDate === "string" ? fmDate : undefined;
				const fmTags = cache?.frontmatter?.tags;
				const tags = Array.isArray(fmTags) ? fmTags.filter((t: unknown) => typeof t === "string") : undefined;
				return {
					path: f.path,
					extension: f.extension,
					mtime: f.stat.mtime,
					ctime: f.stat.ctime,
					createdDate,
					tags,
				};
			});

		const backlogEntries = await this.gatherBacklogEntries();
		this.cachedFiles = files;
		this.cachedIncompleteBacklogItems = await this.gatherIncompleteBacklogItems();
		const stats = computeEnhancedStats(files, this.tilPath, backlogEntries);

		this.renderHeader(content);
		this.renderSummaryCards(content, stats.summary);
		this.renderRandomReviewSection(content);
		this.renderHeatmap(content, stats.heatmap);
		await this.renderRecentSummaries(content, files);
		this.renderCategories(content, stats.categories, stats.backlog);

		if (stats.summary.totalTils === 0) {
			content.createDiv({
				cls: "claude-til-dashboard-empty",
				text: "TIL 파일이 없습니다. 터미널에서 /til 스킬을 실행해보세요.",
			});
		}
	}

	private async gatherBacklogEntries(): Promise<BacklogProgressEntry[]> {
		const backlogFiles = this.app.vault.getFiles().filter((f) => {
			if (!f.path.startsWith(this.tilPath + "/")) return false;
			if (f.name !== "backlog.md") return false;
			return true;
		});

		const entries: BacklogProgressEntry[] = [];
		for (const file of backlogFiles) {
			const content = await this.app.vault.read(file);
			const progress = computeBacklogProgress(content);
			const total = progress.todo + progress.done;
			if (total > 0) {
				entries.push({
					category: extractCategory(file.path, this.tilPath),
					filePath: file.path,
					done: progress.done,
					total,
				});
			}
		}
		return entries;
	}

	private async gatherIncompleteBacklogItems(): Promise<Array<{ displayName: string; path: string; category: string }>> {
		const backlogFiles = this.app.vault.getFiles().filter((f) => {
			if (!f.path.startsWith(this.tilPath + "/")) return false;
			if (f.name !== "backlog.md") return false;
			return true;
		});

		const items: Array<{ displayName: string; path: string; category: string }> = [];
		for (const file of backlogFiles) {
			const content = await this.app.vault.read(file);
			const category = extractCategory(file.path, this.tilPath);
			const backlogItems = parseBacklogItems(content);
			for (const item of backlogItems) {
				items.push({ displayName: item.displayName, path: item.path, category });
			}
		}
		return items;
	}

	private renderRandomReviewSection(container: HTMLElement): void {
		const section = container.createDiv({ cls: "claude-til-dashboard-section claude-til-review-section" });
		this.reviewSectionEl = section;

		const header = section.createDiv({ cls: "claude-til-review-header" });
		header.createEl("h3", { text: "Review" });
		const refreshBtn = header.createEl("button", {
			cls: "claude-til-review-refresh-btn clickable-icon",
			attr: { "aria-label": "Pick another" },
		});
		setIcon(refreshBtn, "shuffle");
		refreshBtn.addEventListener("click", () => {
			this.refreshReviewContent();
		});

		const cardsContainer = section.createDiv({ cls: "claude-til-review-cards" });
		this.renderReviewCards(cardsContainer);
	}

	private refreshReviewContent(): void {
		if (!this.reviewSectionEl) return;
		const cardsContainer = this.reviewSectionEl.querySelector(".claude-til-review-cards") as HTMLElement | null;
		if (!cardsContainer) return;
		cardsContainer.empty();
		this.renderReviewCards(cardsContainer);
	}

	private renderReviewCards(cardsContainer: HTMLElement): void {
		const pick = pickRandomReviewItems(this.cachedFiles, this.tilPath, this.cachedIncompleteBacklogItems);

		if (!pick.til && !pick.backlog) return;

		if (pick.til) {
			const card = cardsContainer.createDiv({ cls: "claude-til-review-card" });
			const cardHeader = card.createDiv({ cls: "claude-til-review-card-header" });
			cardHeader.createSpan({ cls: "claude-til-review-card-type", text: "TIL" });
			cardHeader.createSpan({ cls: "claude-til-review-card-badge", text: pick.til.category });
			const title = pick.til.filename.replace(/\.md$/, "");
			const tfile = this.app.vault.getAbstractFileByPath(pick.til.path);
			let displayTitle = title;
			if (tfile) {
				const cache = this.app.metadataCache.getFileCache(tfile as import("obsidian").TFile);
				if (cache?.headings && cache.headings.length > 0) {
					displayTitle = cache.headings[0]!.heading;
				}
			}
			card.createDiv({ cls: "claude-til-review-card-title", text: displayTitle });
			card.addEventListener("click", () => {
				this.app.workspace.openLinkText(pick.til!.path, "", false);
			});
		}

		if (pick.backlog) {
			const card = cardsContainer.createDiv({ cls: "claude-til-review-card" });
			const cardHeader = card.createDiv({ cls: "claude-til-review-card-header" });
			cardHeader.createSpan({ cls: "claude-til-review-card-type claude-til-review-card-type--backlog", text: "Backlog" });
			cardHeader.createSpan({ cls: "claude-til-review-card-badge", text: pick.backlog.category });
			card.createDiv({ cls: "claude-til-review-card-title", text: pick.backlog.displayName });
			card.addEventListener("click", () => {
				this.app.workspace.openLinkText(pick.backlog!.path, "", false);
			});
		}
	}

	private renderHeader(container: HTMLElement): void {
		const header = container.createDiv({ cls: "claude-til-dashboard-header" });
		header.createEl("h2", { text: "TIL Dashboard" });
		const refreshBtn = header.createEl("button", {
			cls: "claude-til-dashboard-refresh-btn clickable-icon",
			attr: { "aria-label": "Refresh dashboard" },
		});
		setIcon(refreshBtn, "refresh-cw");
		refreshBtn.addEventListener("click", () => {
			this.render();
		});
	}

	private renderSummaryCards(container: HTMLElement, summary: SummaryCards): void {
		const row = container.createDiv({ cls: "claude-til-dashboard-cards-row" });

		const cards: Array<{ value: string; label: string }> = [
			{ value: String(summary.totalTils), label: "Total TILs" },
			{ value: String(summary.categoryCount), label: "Categories" },
			{ value: String(summary.thisWeekCount), label: "This Week" },
			{ value: `${summary.streak}d`, label: "Streak" },
		];

		for (const card of cards) {
			const el = row.createDiv({ cls: "claude-til-dashboard-card" });
			el.createDiv({ cls: "claude-til-dashboard-card-value", text: card.value });
			el.createDiv({ cls: "claude-til-dashboard-card-label", text: card.label });
		}
	}

	private renderHeatmap(container: HTMLElement, heatmap: HeatmapData): void {
		if (heatmap.maxCount === 0) return;

		const section = container.createDiv({ cls: "claude-til-dashboard-section" });
		section.createEl("h3", { text: "Activity" });

		const body = section.createDiv({ cls: "claude-til-heatmap-body" });

		// 요일 레이블 (좌측)
		const dayLabels = body.createDiv({ cls: "claude-til-heatmap-day-labels" });
		const days = ["", "Mon", "", "Wed", "", "Fri", ""];
		for (const day of days) {
			dayLabels.createDiv({ text: day });
		}

		// 스크롤 영역 (월 레이블 + 그리드)
		const scrollWrapper = body.createDiv({ cls: "claude-til-heatmap-scroll" });

		// 월 레이블
		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		const monthRow = scrollWrapper.createDiv({ cls: "claude-til-heatmap-month-labels" });
		const numCols = Math.ceil(heatmap.cells.length / 7);
		let lastMonth = -1;
		let lastLabelCol = -4;
		for (let c = 0; c < numCols; c++) {
			const cellIdx = c * 7;
			if (cellIdx >= heatmap.cells.length) break;
			const dateStr = heatmap.cells[cellIdx]!.date;
			const month = parseInt(dateStr.split("-")[1]!, 10);
			if (month !== lastMonth && (c - lastLabelCol) >= 3) {
				monthRow.createDiv({ cls: "claude-til-heatmap-month-label", text: monthNames[month - 1]! });
				lastMonth = month;
				lastLabelCol = c;
			} else {
				if (month !== lastMonth) lastMonth = month;
				monthRow.createDiv();
			}
		}

		// 히트맵 그리드
		const grid = scrollWrapper.createDiv({ cls: "claude-til-heatmap-grid" });
		for (const cell of heatmap.cells) {
			const cellEl = grid.createDiv({ cls: `claude-til-heatmap-level-${cell.level}` });
			cellEl.dataset.tooltipDate = cell.date;
			cellEl.dataset.tooltipCount = `${cell.count}`;
		}

		// 색상 범례
		const legend = section.createDiv({ cls: "claude-til-heatmap-legend" });
		legend.createSpan({ text: "Less" });
		for (let i = 0; i <= 4; i++) {
			legend.createDiv({ cls: `claude-til-heatmap-legend-cell claude-til-heatmap-level-${i}` });
		}
		legend.createSpan({ text: "More" });
	}

	private renderCategories(container: HTMLElement, categories: EnhancedCategory[], backlog: DashboardBacklogProgress): void {
		if (categories.length === 0) return;

		const section = container.createDiv({ cls: "claude-til-dashboard-section" });
		section.createEl("h3", { text: "Categories" });

		// Overall backlog progress bar (if backlog exists)
		if (backlog.totalItems > 0) {
			const overall = section.createDiv({ cls: "claude-til-dashboard-backlog-overall" });
			const overallPct = Math.round((backlog.totalDone / backlog.totalItems) * 100);
			overall.createDiv({
				cls: "claude-til-dashboard-backlog-overall-text",
				text: `Backlog: ${backlog.totalDone}/${backlog.totalItems} (${overallPct}%)`,
			});
			const barBg = overall.createDiv({ cls: "claude-til-dashboard-progress-bar-bg" });
			const barFill = barBg.createDiv({ cls: "claude-til-dashboard-progress-bar-fill" });
			barFill.style.width = `${overallPct}%`;
		}

		// Backlog lookup map
		const backlogMap = new Map<string, BacklogProgressEntry>();
		for (const entry of backlog.categories) {
			backlogMap.set(entry.category, entry);
		}

		const list = section.createDiv({ cls: "claude-til-dashboard-categories" });

		for (const cat of categories) {
			const wrapper = list.createDiv();
			const bl = backlogMap.get(cat.name);

			// Header row (clickable)
			const header = wrapper.createDiv({ cls: "claude-til-dashboard-category-header" });
			const chevron = header.createSpan({ cls: "claude-til-dashboard-category-chevron", text: "▶" });
			header.createSpan({ cls: "claude-til-dashboard-category-name", text: cat.name });

			// TIL count + backlog progress
			const info = header.createSpan({ cls: "claude-til-dashboard-category-count" });
			if (bl) {
				const blPct = bl.total > 0 ? Math.round((bl.done / bl.total) * 100) : 0;
				info.textContent = `${cat.count} TILs · ${bl.done}/${bl.total} (${blPct}%)`;
			} else {
				info.textContent = `${cat.count} TILs`;
			}

			// Progress bar (backlog progress if available, otherwise proportion)
			const barContainer = header.createDiv({ cls: "claude-til-dashboard-bar-container" });
			const bar = barContainer.createDiv({ cls: "claude-til-dashboard-bar" });
			if (bl && bl.total > 0) {
				bar.style.width = `${(bl.done / bl.total) * 100}%`;
			} else {
				bar.style.width = "0%";
			}

			// File list (hidden by default)
			const filesEl = wrapper.createDiv({ cls: "claude-til-dashboard-category-files" });
			for (const file of cat.files) {
				const tfile = this.app.vault.getAbstractFileByPath(file.path);
				let displayName = file.filename.replace(/\.md$/, "");
				if (tfile) {
					const cache = this.app.metadataCache.getFileCache(tfile as import("obsidian").TFile);
					const headings = cache?.headings;
					if (headings && headings.length > 0) {
						displayName = headings[0]!.heading;
					}
				}
				const item = filesEl.createDiv({ cls: "claude-til-dashboard-file-item", text: displayName });
				item.addEventListener("click", () => {
					this.app.workspace.openLinkText(file.path, "", false);
				});
			}

			// Toggle
			header.addEventListener("click", () => {
				const isOpen = filesEl.hasClass("is-open");
				filesEl.toggleClass("is-open", !isOpen);
				chevron.toggleClass("is-open", !isOpen);
			});
		}
	}

	private async renderRecentSummaries(container: HTMLElement, files: EnhancedStatsFileEntry[]): Promise<void> {
		const maxDisplay = 5;
		// 빈 요약 건너뛰기를 감안해 넉넉하게 선택
		const recentFiles = selectRecentTils(files, this.tilPath, maxDisplay * 3);
		if (recentFiles.length === 0) return;

		const section = container.createDiv({ cls: "claude-til-dashboard-section" });
		section.createEl("h3", { text: "Recent" });

		const list = section.createDiv({ cls: "claude-til-recent-list" });
		let displayed = 0;

		for (const entry of recentFiles) {
			if (displayed >= maxDisplay) break;

			const file = this.app.vault.getAbstractFileByPath(entry.path);
			if (!file) continue;

			const content = await this.app.vault.read(file as import("obsidian").TFile);
			const summary = extractSummary(content);
			if (!summary) continue;

			const filename = entry.path.split("/").pop()?.replace(/\.md$/, "") ?? entry.path;
			const category = extractCategory(entry.path, this.tilPath);
			const date = entry.createdDate ?? "";

			const card = list.createDiv({ cls: "claude-til-recent-card" });
			const header = card.createDiv({ cls: "claude-til-recent-card-header" });
			header.createSpan({ cls: "claude-til-recent-card-title", text: filename });
			header.createSpan({ cls: "claude-til-recent-card-badge", text: category });
			if (date) {
				header.createSpan({ cls: "claude-til-recent-card-date", text: date });
			}
			card.createDiv({ cls: "claude-til-recent-card-summary", text: summary });

			card.addEventListener("click", () => {
				this.app.workspace.openLinkText(entry.path, "", false);
			});
			displayed++;
		}

		// 표시할 항목이 없으면 섹션 제거
		if (displayed === 0) {
			section.remove();
		}
	}

}
