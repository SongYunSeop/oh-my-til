import { describe, it, expect } from "vitest";
import { computeStats } from "../src/core/stats";
import {
	computeStreak,
	computeWeeklyCount,
	computeHeatmapData,
	computeEnhancedCategories,
	computeDashboardBacklog,
	computeWeeklyTrend,
	computeCategoryDistribution,
	computeTreemapLayout,
	computeEnhancedStats,
	formatDashboardText,
	selectRecentTils,
	extractSummary,
	extractDateOnly,
	pickRandomReviewItems,
} from "../src/core/stats";
import type { StatsFileEntry, EnhancedStatsFileEntry, BacklogProgressEntry } from "../src/core/stats";

const DAY_MS = 24 * 60 * 60 * 1000;

function makeFiles(paths: string[]): StatsFileEntry[] {
	return paths.map((p) => ({
		path: p,
		extension: p.split(".").pop() ?? "",
	}));
}

function makeEnhancedFiles(
	entries: Array<{ path: string; mtime?: number; createdDate?: string; tags?: string[] }>,
	baseTime?: number,
): EnhancedStatsFileEntry[] {
	const now = baseTime ?? Date.now();
	return entries.map((e) => ({
		path: e.path,
		extension: e.path.split(".").pop() ?? "",
		mtime: e.mtime ?? now,
		ctime: e.mtime ?? now,
		createdDate: e.createdDate,
		tags: e.tags ?? ["til"],
	}));
}

describe("computeStats", () => {
	it("빈 배열에서 통계를 반환한다", () => {
		const stats = computeStats([], "til");

		expect(stats.totalTils).toBe(0);
		expect(stats.categories).toEqual([]);
	});

	it("TIL 파일 수를 정확히 카운트한다", () => {
		const files = makeFiles([
			"til/typescript/generics.md",
			"til/typescript/mapped-types.md",
			"til/react/hooks.md",
		]);
		const stats = computeStats(files, "til");

		expect(stats.totalTils).toBe(3);
	});

	it("카테고리별로 분류한다", () => {
		const files = makeFiles([
			"til/typescript/generics.md",
			"til/typescript/mapped-types.md",
			"til/react/hooks.md",
			"til/react/context.md",
			"til/react/suspense.md",
		]);
		const stats = computeStats(files, "til");

		expect(stats.categories).toHaveLength(2);
		// react가 3개로 가장 많으므로 첫 번째
		expect(stats.categories[0]).toEqual({ name: "react", count: 3 });
		expect(stats.categories[1]).toEqual({ name: "typescript", count: 2 });
	});

	it("tilPath 외부의 파일은 무시한다", () => {
		const files = makeFiles([
			"til/typescript/generics.md",
			"notes/random.md",
			"daily/2024-01-01.md",
		]);
		const stats = computeStats(files, "til");

		expect(stats.totalTils).toBe(1);
	});

	it(".md가 아닌 파일은 무시한다", () => {
		const files: StatsFileEntry[] = [
			{ path: "til/typescript/generics.md", extension: "md" },
			{ path: "til/typescript/notes.txt", extension: "txt" },
		];
		const stats = computeStats(files, "til");

		expect(stats.totalTils).toBe(1);
	});

	it("하위 폴더가 없는 파일은 uncategorized로 분류한다", () => {
		const files = makeFiles(["til/standalone.md"]);
		const stats = computeStats(files, "til");

		expect(stats.totalTils).toBe(1);
		expect(stats.categories[0]!.name).toBe("(uncategorized)");
	});

	it("커스텀 tilPath를 지원한다", () => {
		const files = makeFiles([
			"learning/typescript/generics.md",
			"til/should-be-ignored.md",
		]);
		const stats = computeStats(files, "learning");

		expect(stats.totalTils).toBe(1);
		expect(stats.categories[0]!.name).toBe("typescript");
	});
});

// --- Enhanced Stats 테스트 ---

describe("computeStreak", () => {
	const now = new Date("2026-02-21T12:00:00Z").getTime();

	it("빈 배열에서 0을 반환한다", () => {
		expect(computeStreak([], "til", now)).toBe(0);
	});

	it("오늘 활동이 있으면 streak 1", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now - 1000 },
		]);
		expect(computeStreak(files, "til", now)).toBe(1);
	});

	it("연속 3일 활동 시 streak 3", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/b.md", mtime: now - 1 * DAY_MS },
			{ path: "til/react/c.md", mtime: now - 2 * DAY_MS },
		]);
		expect(computeStreak(files, "til", now)).toBe(3);
	});

	it("오늘 활동이 없어도 어제부터 연속이면 streak 계산", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now - 1 * DAY_MS },
			{ path: "til/ts/b.md", mtime: now - 2 * DAY_MS },
		]);
		expect(computeStreak(files, "til", now)).toBe(2);
	});

	it("중간에 빈 날이 있으면 streak 끊김", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			// 어제 없음
			{ path: "til/ts/b.md", mtime: now - 2 * DAY_MS },
		]);
		expect(computeStreak(files, "til", now)).toBe(1);
	});

	it("backlog.md는 제외한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/backlog.md", mtime: now },
		]);
		expect(computeStreak(files, "til", now)).toBe(0);
	});

	it("tags:moc 파일은 제외한다", () => {
		const files: EnhancedStatsFileEntry[] = [{
			path: "til/ts/overview.md", extension: "md", mtime: now, ctime: now, tags: ["moc", "til"],
		}];
		expect(computeStreak(files, "til", now)).toBe(0);
	});

	it("tags에 til이 없는 파일은 제외한다", () => {
		const files: EnhancedStatsFileEntry[] = [{
			path: "til/ts/draft.md", extension: "md", mtime: now, ctime: now, tags: ["draft"],
		}];
		expect(computeStreak(files, "til", now)).toBe(0);
	});

	it("tags가 없는 파일은 제외한다", () => {
		const files: EnhancedStatsFileEntry[] = [{
			path: "til/ts/no-tags.md", extension: "md", mtime: now, ctime: now,
		}];
		expect(computeStreak(files, "til", now)).toBe(0);
	});

	it("같은 날 여러 파일이 있어도 streak 1", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/b.md", mtime: now - 1000 },
			{ path: "til/react/c.md", mtime: now - 2000 },
		]);
		expect(computeStreak(files, "til", now)).toBe(1);
	});

	it("tilPath 외부 파일은 무시한다", () => {
		const files = makeEnhancedFiles([
			{ path: "notes/random.md", mtime: now },
		]);
		expect(computeStreak(files, "til", now)).toBe(0);
	});

	it("frontmatter date가 있으면 ctime 대신 사용한다", () => {
		// ctime은 오늘이지만 frontmatter date는 3일 전
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now, createdDate: "2026-02-19" },
			{ path: "til/ts/b.md", mtime: now, createdDate: "2026-02-20" },
			{ path: "til/ts/c.md", mtime: now, createdDate: "2026-02-21" },
		]);
		expect(computeStreak(files, "til", now)).toBe(3);
	});

	it("frontmatter date가 없으면 ctime으로 폴백한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
		]);
		// createdDate 없음 → ctime(=now) 사용 → streak 1
		expect(computeStreak(files, "til", now)).toBe(1);
	});

	it("datetime 형식도 날짜만 추출하여 streak 계산한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now, createdDate: "2026-02-21T09:00:00" },
			{ path: "til/ts/b.md", mtime: now, createdDate: "2026-02-21T18:30:00" },
			{ path: "til/ts/c.md", mtime: now, createdDate: "2026-02-20T14:00:00" },
		]);
		// 2/21에 2개, 2/20에 1개 → 연속 2일
		expect(computeStreak(files, "til", now)).toBe(2);
	});
});

describe("computeWeeklyCount", () => {
	const now = new Date("2026-02-21T12:00:00Z").getTime();

	it("빈 배열에서 0을 반환한다", () => {
		expect(computeWeeklyCount([], "til", now)).toBe(0);
	});

	it("최근 7일 파일만 카운트한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now - 1 * DAY_MS },
			{ path: "til/ts/b.md", mtime: now - 3 * DAY_MS },
			{ path: "til/ts/c.md", mtime: now - 10 * DAY_MS }, // 7일 초과
		]);
		expect(computeWeeklyCount(files, "til", now)).toBe(2);
	});

	it("backlog.md는 제외한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/backlog.md", mtime: now },
		]);
		expect(computeWeeklyCount(files, "til", now)).toBe(1);
	});

	it("frontmatter date 기준으로 카운트한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now, createdDate: "2026-02-20" }, // 어제 → 포함
			{ path: "til/ts/b.md", mtime: now, createdDate: "2026-02-10" }, // 11일 전 → 제외
		]);
		expect(computeWeeklyCount(files, "til", now)).toBe(1);
	});
});

describe("computeHeatmapData", () => {
	const now = new Date("2026-02-21T12:00:00Z").getTime();

	it("빈 배열에서 365개 셀을 반환한다 (모두 level 0)", () => {
		const result = computeHeatmapData([], "til", now);
		expect(result.cells).toHaveLength(365);
		expect(result.maxCount).toBe(0);
		expect(result.cells.every((c) => c.level === 0)).toBe(true);
	});

	it("활동 있는 날짜의 level이 0이 아니다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
		]);
		const result = computeHeatmapData(files, "til", now);
		const todayCell = result.cells[result.cells.length - 1]!;
		expect(todayCell.count).toBe(1);
		expect(todayCell.level).toBeGreaterThan(0);
	});

	it("같은 날 여러 파일이면 count가 누적된다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/b.md", mtime: now - 1000 },
			{ path: "til/react/c.md", mtime: now - 2000 },
		]);
		const result = computeHeatmapData(files, "til", now);
		const todayCell = result.cells[result.cells.length - 1]!;
		expect(todayCell.count).toBe(3);
		expect(result.maxCount).toBe(3);
	});

	it("level 분배가 올바르다 (1-4 quartile)", () => {
		// maxCount=4일 때: 1->L1, 2->L2, 3->L3, 4->L4
		const files = makeEnhancedFiles([
			{ path: "til/a/a1.md", mtime: now },
			{ path: "til/a/a2.md", mtime: now - 1000 },
			{ path: "til/a/a3.md", mtime: now - 2000 },
			{ path: "til/a/a4.md", mtime: now - 3000 },
			{ path: "til/b/b1.md", mtime: now - 1 * DAY_MS },
		]);
		const result = computeHeatmapData(files, "til", now);
		// 오늘: 4건 -> level 4, 어제: 1건 -> level 1
		const todayCell = result.cells[result.cells.length - 1]!;
		const yesterdayCell = result.cells[result.cells.length - 2]!;
		expect(todayCell.level).toBe(4);
		expect(yesterdayCell.level).toBe(1);
	});

	it("365일 이전 데이터는 셀에 포함되지 않는다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/old.md", mtime: now - 400 * DAY_MS },
		]);
		const result = computeHeatmapData(files, "til", now);
		expect(result.cells.every((c) => c.count === 0)).toBe(true);
	});

	it("frontmatter date 기준으로 히트맵을 생성한다", () => {
		// ctime은 모두 오늘이지만 frontmatter date는 다른 날짜
		const files = makeEnhancedFiles([
			{ path: "til/a/a1.md", mtime: now, createdDate: "2026-02-21" },
			{ path: "til/a/a2.md", mtime: now, createdDate: "2026-02-20" },
		]);
		const result = computeHeatmapData(files, "til", now);
		const todayCell = result.cells[result.cells.length - 1]!;
		const yesterdayCell = result.cells[result.cells.length - 2]!;
		expect(todayCell.count).toBe(1);
		expect(yesterdayCell.count).toBe(1);
	});
});

describe("computeEnhancedCategories", () => {
	const now = new Date("2026-02-21T12:00:00Z").getTime();

	it("빈 배열에서 빈 카테고리를 반환한다", () => {
		expect(computeEnhancedCategories([], "til")).toEqual([]);
	});

	it("카테고리별로 파일을 분류한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/b.md", mtime: now - 1 * DAY_MS },
			{ path: "til/react/c.md", mtime: now },
		]);
		const result = computeEnhancedCategories(files, "til");

		expect(result).toHaveLength(2);
		expect(result[0]!.name).toBe("ts");
		expect(result[0]!.count).toBe(2);
		expect(result[1]!.name).toBe("react");
		expect(result[1]!.count).toBe(1);
	});

	it("파일이 mtime 역순 정렬된다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/old.md", mtime: now - 5 * DAY_MS },
			{ path: "til/ts/new.md", mtime: now },
		]);
		const result = computeEnhancedCategories(files, "til");
		expect(result[0]!.files[0]!.filename).toBe("new.md");
		expect(result[0]!.files[1]!.filename).toBe("old.md");
	});

	it("backlog.md를 제외한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/backlog.md", mtime: now },
		]);
		const result = computeEnhancedCategories(files, "til");
		expect(result[0]!.count).toBe(1);
	});
});

describe("computeDashboardBacklog", () => {
	it("빈 배열에서 빈 결과를 반환한다", () => {
		const result = computeDashboardBacklog([]);
		expect(result.totalDone).toBe(0);
		expect(result.totalItems).toBe(0);
		expect(result.categories).toEqual([]);
	});

	it("총합을 올바르게 계산한다", () => {
		const entries: BacklogProgressEntry[] = [
			{ category: "ts", filePath: "til/ts/backlog.md", done: 5, total: 10 },
			{ category: "react", filePath: "til/react/backlog.md", done: 3, total: 8 },
		];
		const result = computeDashboardBacklog(entries);
		expect(result.totalDone).toBe(8);
		expect(result.totalItems).toBe(18);
	});

	it("진행률 내림차순으로 정렬한다", () => {
		const entries: BacklogProgressEntry[] = [
			{ category: "low", filePath: "til/low/backlog.md", done: 1, total: 10 }, // 10%
			{ category: "high", filePath: "til/high/backlog.md", done: 9, total: 10 }, // 90%
			{ category: "mid", filePath: "til/mid/backlog.md", done: 5, total: 10 }, // 50%
		];
		const result = computeDashboardBacklog(entries);
		expect(result.categories[0]!.category).toBe("high");
		expect(result.categories[1]!.category).toBe("mid");
		expect(result.categories[2]!.category).toBe("low");
	});
});

describe("computeWeeklyTrend", () => {
	const now = new Date("2026-02-21T12:00:00Z").getTime(); // Saturday

	it("빈 배열에서 16주 엔트리를 반환한다 (모두 count 0)", () => {
		const result = computeWeeklyTrend([], "til", 16, now);
		expect(result).toHaveLength(16);
		expect(result.every(w => w.count === 0)).toBe(true);
	});

	it("이번 주 파일을 마지막 엔트리에 카운트한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now, createdDate: "2026-02-21" },
			{ path: "til/ts/b.md", mtime: now, createdDate: "2026-02-20" },
		]);
		const result = computeWeeklyTrend(files, "til", 16, now);
		expect(result[result.length - 1]!.count).toBe(2);
	});

	it("weekCount를 조정할 수 있다", () => {
		const result = computeWeeklyTrend([], "til", 8, now);
		expect(result).toHaveLength(8);
	});

	it("주간 범위 밖의 파일은 무시한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now, createdDate: "2025-01-01" },
		]);
		const result = computeWeeklyTrend(files, "til", 16, now);
		expect(result.every(w => w.count === 0)).toBe(true);
	});

	it("backlog.md와 moc 파일은 제외한다", () => {
		const files: EnhancedStatsFileEntry[] = [
			{ path: "til/ts/backlog.md", extension: "md", mtime: now, ctime: now, tags: ["til"], createdDate: "2026-02-21" },
			{ path: "til/ts/moc.md", extension: "md", mtime: now, ctime: now, tags: ["moc", "til"], createdDate: "2026-02-21" },
			{ path: "til/ts/real.md", extension: "md", mtime: now, ctime: now, tags: ["til"], createdDate: "2026-02-21" },
		];
		const result = computeWeeklyTrend(files, "til", 16, now);
		expect(result[result.length - 1]!.count).toBe(1);
	});

	it("weekStart 레이블이 M/D 형식이다", () => {
		const result = computeWeeklyTrend([], "til", 4, now);
		for (const entry of result) {
			expect(entry.weekStart).toMatch(/^\d{1,2}\/\d{1,2}$/);
		}
	});

	it("다른 주의 파일을 별개의 엔트리에 카운트한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now, createdDate: "2026-02-21" }, // 이번 주
			{ path: "til/ts/b.md", mtime: now, createdDate: "2026-02-14" }, // 지난 주
		]);
		const result = computeWeeklyTrend(files, "til", 16, now);
		expect(result[result.length - 1]!.count).toBe(1);
		expect(result[result.length - 2]!.count).toBe(1);
	});
});

describe("computeCategoryDistribution", () => {
	const now = new Date("2026-02-21T12:00:00Z").getTime();

	it("빈 배열에서 빈 결과를 반환한다", () => {
		expect(computeCategoryDistribution([], "til")).toEqual([]);
	});

	it("카테고리별 분포를 계산한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/b.md", mtime: now },
			{ path: "til/react/c.md", mtime: now },
		]);
		const result = computeCategoryDistribution(files, "til");
		expect(result).toHaveLength(2);
		expect(result[0]!.name).toBe("ts");
		expect(result[0]!.count).toBe(2);
		expect(result[0]!.percentage).toBe(67);
		expect(result[1]!.name).toBe("react");
		expect(result[1]!.count).toBe(1);
		expect(result[1]!.percentage).toBe(33);
	});

	it("count 내림차순으로 정렬한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/react/a.md", mtime: now },
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/b.md", mtime: now },
			{ path: "til/ts/c.md", mtime: now },
		]);
		const result = computeCategoryDistribution(files, "til");
		expect(result[0]!.name).toBe("ts");
		expect(result[1]!.name).toBe("react");
	});

	it("backlog.md는 제외한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/backlog.md", mtime: now },
		]);
		const result = computeCategoryDistribution(files, "til");
		expect(result).toHaveLength(1);
		expect(result[0]!.count).toBe(1);
		expect(result[0]!.percentage).toBe(100);
	});

	it("tilPath 외부 파일은 무시한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "notes/random.md", mtime: now },
		]);
		const result = computeCategoryDistribution(files, "til");
		expect(result).toHaveLength(1);
	});
});

describe("computeTreemapLayout", () => {
	it("빈 데이터에서 빈 배열을 반환한다", () => {
		expect(computeTreemapLayout([], 400, 160)).toEqual([]);
	});

	it("단일 항목은 전체 영역을 차지한다", () => {
		const data = [{ name: "ts", count: 10, percentage: 100 }];
		const result = computeTreemapLayout(data, 400, 160);
		expect(result).toHaveLength(1);
		expect(result[0]!.x).toBe(0);
		expect(result[0]!.y).toBe(0);
		expect(result[0]!.width).toBe(400);
		expect(result[0]!.height).toBe(160);
		expect(result[0]!.name).toBe("ts");
		expect(result[0]!.colorIndex).toBe(0);
	});

	it("여러 항목을 면적 비례로 분할한다", () => {
		const data = [
			{ name: "ts", count: 50, percentage: 50 },
			{ name: "react", count: 50, percentage: 50 },
		];
		const result = computeTreemapLayout(data, 400, 160);
		expect(result).toHaveLength(2);
		// 전체 면적 합이 원래 면적과 같아야 함
		const totalArea = result.reduce((s, r) => s + r.width * r.height, 0);
		expect(totalArea).toBeCloseTo(400 * 160, 0);
	});

	it("maxSegments를 초과하면 Others로 묶는다", () => {
		const data = Array.from({ length: 10 }, (_, i) => ({
			name: `cat${i}`,
			count: 10 - i,
			percentage: 10,
		}));
		const result = computeTreemapLayout(data, 400, 160, 7);
		// 7 + 1(Others) = 8
		expect(result).toHaveLength(8);
		expect(result[result.length - 1]!.name).toBe("Others");
	});

	it("width 또는 height가 0이면 빈 배열을 반환한다", () => {
		const data = [{ name: "ts", count: 10, percentage: 100 }];
		expect(computeTreemapLayout(data, 0, 160)).toEqual([]);
		expect(computeTreemapLayout(data, 400, 0)).toEqual([]);
	});

	it("각 rect의 colorIndex가 순서대로 할당된다", () => {
		const data = [
			{ name: "a", count: 30, percentage: 50 },
			{ name: "b", count: 20, percentage: 33 },
			{ name: "c", count: 10, percentage: 17 },
		];
		const result = computeTreemapLayout(data, 400, 160);
		const indices = result.map((r) => r.colorIndex).sort((a, b) => a - b);
		expect(indices).toEqual([0, 1, 2]);
	});

	it("모든 rect가 경계 안에 있다", () => {
		const data = [
			{ name: "a", count: 25, percentage: 25 },
			{ name: "b", count: 23, percentage: 23 },
			{ name: "c", count: 22, percentage: 22 },
			{ name: "d", count: 15, percentage: 15 },
			{ name: "e", count: 15, percentage: 15 },
		];
		const W = 400;
		const H = 160;
		const result = computeTreemapLayout(data, W, H);
		for (const r of result) {
			expect(r.x).toBeGreaterThanOrEqual(0);
			expect(r.y).toBeGreaterThanOrEqual(0);
			expect(r.x + r.width).toBeLessThanOrEqual(W + 0.01);
			expect(r.y + r.height).toBeLessThanOrEqual(H + 0.01);
			expect(r.width).toBeGreaterThan(0);
			expect(r.height).toBeGreaterThan(0);
		}
	});
});

describe("computeEnhancedStats", () => {
	const now = new Date("2026-02-21T12:00:00Z").getTime();

	it("빈 데이터에서 기본값을 반환한다", () => {
		const result = computeEnhancedStats([], "til", [], now);
		expect(result.summary.totalTils).toBe(0);
		expect(result.summary.categoryCount).toBe(0);
		expect(result.summary.thisWeekCount).toBe(0);
		expect(result.summary.streak).toBe(0);
		expect(result.heatmap.cells).toHaveLength(365);
		expect(result.categories).toEqual([]);
		expect(result.backlog.totalItems).toBe(0);
		expect(result.weeklyTrend).toHaveLength(16);
		expect(result.categoryDistribution).toEqual([]);
	});

	it("모든 섹션을 올바르게 조합한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/b.md", mtime: now - 1 * DAY_MS },
			{ path: "til/react/c.md", mtime: now - 2 * DAY_MS },
		]);
		const backlog: BacklogProgressEntry[] = [
			{ category: "ts", filePath: "til/ts/backlog.md", done: 5, total: 10 },
		];
		const result = computeEnhancedStats(files, "til", backlog, now);

		expect(result.summary.totalTils).toBe(3);
		expect(result.summary.categoryCount).toBe(2);
		expect(result.summary.thisWeekCount).toBe(3);
		expect(result.summary.streak).toBe(3);
		expect(result.categories).toHaveLength(2);
		expect(result.backlog.totalDone).toBe(5);
		expect(result.backlog.totalItems).toBe(10);
		expect(result.weeklyTrend).toHaveLength(16);
		expect(result.categoryDistribution).toHaveLength(2);
	});
});

describe("formatDashboardText", () => {
	const now = new Date("2026-02-21T12:00:00Z").getTime();

	it("텍스트 출력에 모든 섹션이 포함된다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
		]);
		const backlog: BacklogProgressEntry[] = [
			{ category: "ts", filePath: "til/ts/backlog.md", done: 5, total: 10 },
		];
		const stats = computeEnhancedStats(files, "til", backlog, now);
		const text = formatDashboardText(stats);

		expect(text).toContain("학습 대시보드");
		expect(text).toContain("총 TIL");
		expect(text).toContain("카테고리");
		expect(text).toContain("이번 주");
		expect(text).toContain("연속 학습");
		expect(text).toContain("활동 추이");
		expect(text).toContain("카테고리별 현황");
		expect(text).toContain("백로그 진행률");
	});

	it("빈 데이터에서도 기본 요약을 표시한다", () => {
		const stats = computeEnhancedStats([], "til", [], now);
		const text = formatDashboardText(stats);

		expect(text).toContain("총 TIL | 0개");
		expect(text).toContain("연속 학습 | 0일");
		// 백로그가 없으면 백로그 섹션 없음
		expect(text).not.toContain("백로그 진행률");
	});
});

describe("selectRecentTils", () => {
	const now = new Date("2026-02-21T12:00:00Z").getTime();

	it("빈 배열에서 빈 결과를 반환한다", () => {
		expect(selectRecentTils([], "til", 5)).toEqual([]);
	});

	it("frontmatter date 역순으로 최근 N개를 반환한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/old.md", mtime: now, createdDate: "2026-02-10" },
			{ path: "til/ts/mid.md", mtime: now, createdDate: "2026-02-15" },
			{ path: "til/ts/new.md", mtime: now, createdDate: "2026-02-21" },
		]);
		const result = selectRecentTils(files, "til", 2);
		expect(result).toHaveLength(2);
		expect(result[0]!.path).toBe("til/ts/new.md");
		expect(result[1]!.path).toBe("til/ts/mid.md");
	});

	it("count보다 파일이 적으면 전체를 반환한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
		]);
		const result = selectRecentTils(files, "til", 5);
		expect(result).toHaveLength(1);
	});

	it("backlog.md를 제외한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/backlog.md", mtime: now },
		]);
		const result = selectRecentTils(files, "til", 5);
		expect(result).toHaveLength(1);
		expect(result[0]!.path).toBe("til/ts/a.md");
	});

	it("tags:moc 파일을 제외한다", () => {
		const files: EnhancedStatsFileEntry[] = [
			{ path: "til/ts/a.md", extension: "md", mtime: now, ctime: now, tags: ["til"] },
			{ path: "til/TIL MOC.md", extension: "md", mtime: now, ctime: now, tags: ["moc", "til"] },
		];
		const result = selectRecentTils(files, "til", 5);
		expect(result).toHaveLength(1);
		expect(result[0]!.path).toBe("til/ts/a.md");
	});

	it("tilPath 외부 파일은 무시한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "notes/random.md", mtime: now },
		]);
		const result = selectRecentTils(files, "til", 5);
		expect(result).toHaveLength(1);
	});

	it("datetime 형식으로 같은 날 파일을 정확히 정렬한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/morning.md", mtime: now, createdDate: "2026-02-21T09:00:00" },
			{ path: "til/ts/evening.md", mtime: now, createdDate: "2026-02-21T18:30:00" },
			{ path: "til/ts/afternoon.md", mtime: now, createdDate: "2026-02-21T14:00:00" },
		]);
		const result = selectRecentTils(files, "til", 3);
		expect(result[0]!.path).toBe("til/ts/evening.md");
		expect(result[1]!.path).toBe("til/ts/afternoon.md");
		expect(result[2]!.path).toBe("til/ts/morning.md");
	});

	it("date-only와 datetime 형식이 혼재해도 정렬된다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/old.md", mtime: now, createdDate: "2026-02-20" },
			{ path: "til/ts/new-time.md", mtime: now, createdDate: "2026-02-21T14:00:00" },
			{ path: "til/ts/new-date.md", mtime: now, createdDate: "2026-02-21" },
		]);
		const result = selectRecentTils(files, "til", 3);
		// datetime이 date-only보다 뒤에 오므로 (T > 빈문자열) datetime이 먼저
		expect(result[0]!.path).toBe("til/ts/new-time.md");
		expect(result[1]!.path).toBe("til/ts/new-date.md");
		expect(result[2]!.path).toBe("til/ts/old.md");
	});
});

describe("extractDateOnly", () => {
	it("YYYY-MM-DD를 그대로 반환한다", () => {
		expect(extractDateOnly("2026-02-21")).toBe("2026-02-21");
	});

	it("YYYY-MM-DDTHH:mm:ss에서 날짜만 추출한다", () => {
		expect(extractDateOnly("2026-02-21T14:30:00")).toBe("2026-02-21");
	});
});

describe("pickRandomReviewItems", () => {
	const now = new Date("2026-02-21T12:00:00Z").getTime();

	it("빈 데이터에서 빈 결과를 반환한다", () => {
		const result = pickRandomReviewItems([], "til", [], () => 0);
		expect(result.til).toBeUndefined();
		expect(result.backlog).toBeUndefined();
	});

	it("TIL 파일에서 랜덤으로 1개를 선택한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/ts/b.md", mtime: now },
			{ path: "til/react/c.md", mtime: now },
		]);
		// randomFn이 0.0을 반환하면 첫 번째 항목 선택
		const result = pickRandomReviewItems(files, "til", [], () => 0);
		expect(result.til).toBeDefined();
		expect(result.til!.path).toBe("til/ts/a.md");
		expect(result.til!.filename).toBe("a.md");
		expect(result.til!.category).toBe("ts");
	});

	it("randomFn 값에 따라 다른 항목을 선택한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
			{ path: "til/react/b.md", mtime: now },
		]);
		// 0.99 → index 1
		const result = pickRandomReviewItems(files, "til", [], () => 0.99);
		expect(result.til!.path).toBe("til/react/b.md");
		expect(result.til!.category).toBe("react");
	});

	it("미완료 백로그 항목에서 랜덤으로 1개를 선택한다", () => {
		const backlogItems = [
			{ displayName: "Generics", path: "til/ts/generics.md", category: "ts" },
			{ displayName: "Hooks", path: "til/react/hooks.md", category: "react" },
		];
		const result = pickRandomReviewItems([], "til", backlogItems, () => 0.5);
		expect(result.backlog).toBeDefined();
		expect(result.backlog!.displayName).toBe("Hooks");
		expect(result.backlog!.category).toBe("react");
	});

	it("TIL과 백로그를 동시에 선택한다", () => {
		const files = makeEnhancedFiles([
			{ path: "til/ts/a.md", mtime: now },
		]);
		const backlogItems = [
			{ displayName: "Hooks", path: "til/react/hooks.md", category: "react" },
		];
		const result = pickRandomReviewItems(files, "til", backlogItems, () => 0);
		expect(result.til).toBeDefined();
		expect(result.backlog).toBeDefined();
	});

	it("backlog.md와 moc 태그 파일은 TIL 선택에서 제외한다", () => {
		const files: EnhancedStatsFileEntry[] = [
			{ path: "til/ts/backlog.md", extension: "md", mtime: now, ctime: now, tags: ["til"] },
			{ path: "til/ts/moc.md", extension: "md", mtime: now, ctime: now, tags: ["moc", "til"] },
			{ path: "til/ts/real.md", extension: "md", mtime: now, ctime: now, tags: ["til"] },
		];
		const result = pickRandomReviewItems(files, "til", [], () => 0);
		expect(result.til!.path).toBe("til/ts/real.md");
	});

	it("tilPath 외부 파일은 무시한다", () => {
		const files = makeEnhancedFiles([
			{ path: "notes/random.md", mtime: now },
		]);
		const result = pickRandomReviewItems(files, "til", [], () => 0);
		expect(result.til).toBeUndefined();
	});
});

describe("extractSummary", () => {
	it("frontmatter 이후 첫 문단을 추출한다", () => {
		const content = `---
date: 2026-02-21
---

# TypeScript Generics

제네릭은 타입을 매개변수화하는 기법이다.

더 자세한 내용은 아래를 참고.`;
		const result = extractSummary(content);
		expect(result).toBe("제네릭은 타입을 매개변수화하는 기법이다.");
	});

	it("frontmatter가 없는 경우에도 동작한다", () => {
		const content = `# React Hooks

Hooks를 사용하면 함수형 컴포넌트에서 상태를 관리할 수 있다.`;
		const result = extractSummary(content);
		expect(result).toBe("Hooks를 사용하면 함수형 컴포넌트에서 상태를 관리할 수 있다.");
	});

	it("maxLength를 초과하면 말줄임한다", () => {
		const content = "이것은 매우 긴 문장입니다. ".repeat(10);
		const result = extractSummary(content, 30);
		expect(result.length).toBe(30);
		expect(result.endsWith("\u2026")).toBe(true);
	});

	it("코드 블록 내용은 건너뛴다", () => {
		const content = `---
date: 2026-02-21
---

# Example

\`\`\`typescript
const x = 1;
\`\`\`

실제 본문 텍스트입니다.`;
		const result = extractSummary(content);
		expect(result).toBe("실제 본문 텍스트입니다.");
	});

	it("빈 내용에서 빈 문자열을 반환한다", () => {
		expect(extractSummary("")).toBe("");
		expect(extractSummary("---\ndate: 2026-02-21\n---")).toBe("");
	});

	it("여러 줄 문단을 하나로 합친다", () => {
		const content = `---
date: 2026-02-21
---

# Title

첫 번째 줄입니다.
두 번째 줄입니다.

다음 문단은 무시.`;
		const result = extractSummary(content);
		expect(result).toBe("첫 번째 줄입니다. 두 번째 줄입니다.");
	});

	it("~~~ 코드 블록을 건너뛴다", () => {
		const content = `# Example

~~~python
print("hello")
~~~

실제 본문입니다.`;
		const result = extractSummary(content);
		expect(result).toBe("실제 본문입니다.");
	});

	it("callout 시작 줄(> [!type] 제목)은 전체 스킵한다", () => {
		const content = `# Title

> [!tldr] 한줄 요약
> 실제 내용입니다.`;
		const result = extractSummary(content);
		expect(result).toBe("실제 내용입니다.");
	});

	it("callout만 있고 본문이 없으면 빈 문자열을 반환한다", () => {
		const content = `# Title

> [!tldr] 한줄 요약`;
		const result = extractSummary(content);
		expect(result).toBe("");
	});

	it("blockquote(>) 접두사를 제거한다", () => {
		const content = `# Title

> 인용문 내용입니다.`;
		const result = extractSummary(content);
		expect(result).toBe("인용문 내용입니다.");
	});

	it("빈 blockquote 줄은 건너뛴다", () => {
		const content = `# Title

>
> 실제 내용입니다.`;
		const result = extractSummary(content);
		expect(result).toBe("실제 내용입니다.");
	});
});
