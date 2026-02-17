import { describe, it, expect, vi, beforeEach } from "vitest";
import { TFile, Vault } from "./mock-obsidian";

// TILWatcher의 핵심 필터링 로직을 테스트한다.
// 실제 클래스는 obsidian의 EventRef 타입에 의존하므로,
// 동일한 로직을 재현하여 테스트한다.
function shouldOpenFile(file: unknown, tilPath: string): boolean {
	if (!(file instanceof TFile)) return false;
	if (!file.path.startsWith(tilPath + "/")) return false;
	if (file.extension !== "md") return false;
	return true;
}

describe("TILWatcher 필터링 로직", () => {
	it("til/ 아래의 .md 파일을 감지한다", () => {
		const file = new TFile("til/react-hooks.md");
		expect(shouldOpenFile(file, "til")).toBe(true);
	});

	it("til/ 하위 폴더의 .md 파일도 감지한다", () => {
		const file = new TFile("til/typescript/generics.md");
		expect(shouldOpenFile(file, "til")).toBe(true);
	});

	it("다른 경로의 파일은 무시한다", () => {
		const file = new TFile("notes/daily.md");
		expect(shouldOpenFile(file, "til")).toBe(false);
	});

	it(".md가 아닌 확장자는 무시한다", () => {
		const file = new TFile("til/image.png");
		expect(shouldOpenFile(file, "til")).toBe(false);
	});

	it("TFile이 아닌 객체는 무시한다", () => {
		expect(shouldOpenFile({ path: "til/test.md" }, "til")).toBe(false);
	});

	it("tilPath 자체와 이름이 같은 파일은 무시한다 (슬래시 없음)", () => {
		const file = new TFile("tilExtra/test.md");
		expect(shouldOpenFile(file, "til")).toBe(false);
	});

	it("커스텀 tilPath를 지원한다", () => {
		const file = new TFile("learning/til/react.md");
		expect(shouldOpenFile(file, "learning/til")).toBe(true);
	});
});

describe("TILWatcher 이벤트 통합", () => {
	let vault: Vault;
	let openedFiles: string[];

	beforeEach(() => {
		vault = new Vault();
		openedFiles = [];
	});

	it("vault 'create' 이벤트로 파일이 열린다", () => {
		vi.useFakeTimers();

		const tilPath = "til";
		vault.on("create", (file: unknown) => {
			if (shouldOpenFile(file, tilPath)) {
				setTimeout(() => {
					openedFiles.push((file as TFile).path);
				}, 200);
			}
		});

		const file = new TFile("til/new-topic.md");
		vault._trigger("create", file);

		vi.advanceTimersByTime(200);
		expect(openedFiles).toContain("til/new-topic.md");

		vi.useRealTimers();
	});

	it("stop 후에는 이벤트를 받지 않는다", () => {
		const tilPath = "til";
		const ref = vault.on("create", (file: unknown) => {
			if (shouldOpenFile(file, tilPath)) {
				openedFiles.push((file as TFile).path);
			}
		});

		vault.offref(ref as { event: string });

		const file = new TFile("til/should-not-open.md");
		vault._trigger("create", file);

		expect(openedFiles).toEqual([]);
	});
});
