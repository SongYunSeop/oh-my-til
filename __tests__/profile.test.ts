import { describe, it, expect } from "vitest";
import {
	generateTilPageHtml,
	generateCategoryIndexHtml,
	generateProfileHtml,
	renderAllTilsHtml,
	getProfileCss,
	renderSummaryCardsHtml,
	renderRecentTilsHtml,
} from "../src/core/profile";
import type { ProfileConfig, TilPageData, CategoryPageData, CategoryTilGroup, RecentTilEntry } from "../src/core/profile";

const config: ProfileConfig = {
	title: "My TIL",
	description: "Today I Learned",
	githubUrl: "https://github.com/test",
};

describe("getProfileCss", () => {
	it("CSS 문자열을 반환한다", () => {
		const css = getProfileCss();
		expect(css).toContain("--bg-primary");
		expect(css).toContain("--accent");
		expect(css).toContain(".til-content");
	});
});

describe("generateTilPageHtml", () => {
	const data: TilPageData = {
		title: "Async Await Patterns",
		category: "typescript",
		createdDate: "2025-01-15",
		contentHtml: "<h2>Introduction</h2><p>Hello world</p>",
	};

	it("완전한 HTML 문서를 반환한다", () => {
		const html = generateTilPageHtml(data, config);
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("</html>");
	});

	it("제목을 포함한다", () => {
		const html = generateTilPageHtml(data, config);
		expect(html).toContain("Async Await Patterns");
		expect(html).toContain("<title>Async Await Patterns — My TIL</title>");
	});

	it("카테고리 뱃지를 포함한다", () => {
		const html = generateTilPageHtml(data, config);
		expect(html).toContain('class="badge"');
		expect(html).toContain("typescript");
	});

	it("날짜를 포함한다", () => {
		const html = generateTilPageHtml(data, config);
		expect(html).toContain("2025-01-15");
	});

	it("본문 HTML을 포함한다", () => {
		const html = generateTilPageHtml(data, config);
		expect(html).toContain("<h2>Introduction</h2>");
		expect(html).toContain("<p>Hello world</p>");
	});

	it("breadcrumb 네비게이션을 포함한다", () => {
		const html = generateTilPageHtml(data, config);
		expect(html).toContain('class="breadcrumb"');
		// TIL 페이지는 {category}/{slug}.html에 위치하므로 홈은 ../index.html, 카테고리는 index.html
		expect(html).toContain('href="../index.html"');
		expect(html).toContain('href="index.html"');
	});

	it("XSS를 방지한다", () => {
		const xssData: TilPageData = {
			title: '<script>alert("xss")</script>',
			category: "test",
			createdDate: "2025-01-01",
			contentHtml: "<p>safe</p>",
		};
		const html = generateTilPageHtml(xssData, config);
		expect(html).not.toContain("<script>alert");
		expect(html).toContain("&lt;script&gt;");
	});
});

describe("generateCategoryIndexHtml", () => {
	const data: CategoryPageData = {
		category: "typescript",
		tils: [
			{ title: "Async Patterns", slug: "async-patterns", createdDate: "2025-01-15", summary: "Learn async/await" },
			{ title: "Generics", slug: "generics", createdDate: "2025-01-10", summary: "" },
		],
	};

	it("카테고리 이름을 포함한다", () => {
		const html = generateCategoryIndexHtml(data, config);
		expect(html).toContain("typescript");
		expect(html).toContain("2 TILs");
	});

	it("TIL 목록 링크를 포함한다", () => {
		const html = generateCategoryIndexHtml(data, config);
		expect(html).toContain("async-patterns.html");
		expect(html).toContain("Async Patterns");
		expect(html).toContain("generics.html");
		expect(html).toContain("Generics");
	});

	it("요약을 포함한다", () => {
		const html = generateCategoryIndexHtml(data, config);
		expect(html).toContain("Learn async/await");
	});

	it("날짜를 포함한다", () => {
		const html = generateCategoryIndexHtml(data, config);
		expect(html).toContain("2025-01-15");
		expect(html).toContain("2025-01-10");
	});

	it("breadcrumb을 포함한다", () => {
		const html = generateCategoryIndexHtml(data, config);
		expect(html).toContain("../index.html");
	});
});

describe("renderAllTilsHtml", () => {
	const categories: CategoryTilGroup[] = [
		{
			name: "typescript",
			tils: [
				{ title: "Async", slug: "async", createdDate: "2025-01-15" },
				{ title: "Generics", slug: "generics", createdDate: "2025-01-10" },
			],
		},
		{
			name: "rust",
			tils: [
				{ title: "Ownership", slug: "ownership", createdDate: "2025-01-12" },
			],
		},
	];

	it("카테고리별 접이식 그룹을 생성한다", () => {
		const html = renderAllTilsHtml(categories);
		expect(html).toContain("<details");
		expect(html).toContain("<summary>");
		expect(html).toContain("typescript");
		expect(html).toContain("rust");
	});

	it("각 카테고리의 TIL 수를 표시한다", () => {
		const html = renderAllTilsHtml(categories);
		expect(html).toContain("(2)");
		expect(html).toContain("(1)");
	});

	it("전체 TIL 수를 표시한다", () => {
		const html = renderAllTilsHtml(categories);
		expect(html).toContain("All TILs (3)");
	});

	it("각 TIL에 올바른 링크를 생성한다", () => {
		const html = renderAllTilsHtml(categories);
		expect(html).toContain("typescript/async.html");
		expect(html).toContain("typescript/generics.html");
		expect(html).toContain("rust/ownership.html");
	});

	it("빈 카테고리 배열은 빈 문자열을 반환한다", () => {
		expect(renderAllTilsHtml([])).toBe("");
	});
});

describe("renderSummaryCardsHtml", () => {
	it("4개의 카드를 렌더링한다", () => {
		const html = renderSummaryCardsHtml(42, 5, 3, 7);
		expect(html).toContain("summary-cards");
		expect(html).toContain("42");
		expect(html).toContain("5");
		expect(html).toContain("3");
		expect(html).toContain("7");
	});

	it("카드 레이블을 포함한다", () => {
		const html = renderSummaryCardsHtml(0, 0, 0, 0);
		expect(html).toContain("Total TILs");
		expect(html).toContain("Categories");
		expect(html).toContain("This Week");
		expect(html).toContain("Streak");
	});

	it("0 값을 올바르게 표시한다", () => {
		const html = renderSummaryCardsHtml(0, 0, 0, 0);
		expect(html).toContain("card-value");
	});
});

describe("renderRecentTilsHtml", () => {
	const recent: RecentTilEntry[] = [
		{ title: "Async Patterns", slug: "async-patterns", category: "typescript", createdDate: "2025-01-15", summary: "Learn async/await" },
		{ title: "Ownership", slug: "ownership", category: "rust", createdDate: "2025-01-12", summary: "" },
	];

	it("최근 TIL 카드를 렌더링한다", () => {
		const html = renderRecentTilsHtml(recent);
		expect(html).toContain("recent-tils-section");
		expect(html).toContain("Recent TILs");
		expect(html).toContain("Async Patterns");
		expect(html).toContain("Ownership");
	});

	it("카테고리 뱃지를 포함한다", () => {
		const html = renderRecentTilsHtml(recent);
		expect(html).toContain('class="badge"');
		expect(html).toContain("typescript");
		expect(html).toContain("rust");
	});

	it("올바른 링크를 생성한다", () => {
		const html = renderRecentTilsHtml(recent);
		expect(html).toContain("typescript/async-patterns.html");
		expect(html).toContain("rust/ownership.html");
	});

	it("요약이 있으면 표시한다", () => {
		const html = renderRecentTilsHtml(recent);
		expect(html).toContain("Learn async/await");
	});

	it("요약이 없으면 recent-til-summary를 생략한다", () => {
		const noSummary: RecentTilEntry[] = [
			{ title: "Ownership", slug: "ownership", category: "rust", createdDate: "2025-01-12", summary: "" },
		];
		const html = renderRecentTilsHtml(noSummary);
		expect(html).not.toContain("recent-til-summary");
	});

	it("빈 배열은 빈 문자열을 반환한다", () => {
		expect(renderRecentTilsHtml([])).toBe("");
	});
});

describe("generateProfileHtml", () => {
	it("프로필 페이지를 생성한다", () => {
		const html = generateProfileHtml(config, "<div>cards</div>", "<div>heatmap</div>", "<div>recent</div>", "<div>tils</div>");
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("My TIL");
		expect(html).toContain("Today I Learned");
		expect(html).toContain("<div>cards</div>");
		expect(html).toContain("<div>heatmap</div>");
		expect(html).toContain("<div>recent</div>");
		expect(html).toContain("<div>tils</div>");
	});

	it("GitHub 링크를 포함한다", () => {
		const html = generateProfileHtml(config, "", "", "", "");
		expect(html).toContain("https://github.com/test");
	});

	it("GitHub URL이 없으면 링크를 생략한다", () => {
		const noGithub: ProfileConfig = { title: "TIL", description: "desc" };
		const html = generateProfileHtml(noGithub, "", "", "", "");
		expect(html).not.toContain("GitHub</a>");
	});

	it("oh-my-til 링크를 포함한다", () => {
		const html = generateProfileHtml(config, "", "", "", "");
		expect(html).toContain("oh-my-til");
	});
});
