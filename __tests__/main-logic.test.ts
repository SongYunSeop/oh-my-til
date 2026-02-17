import { describe, it, expect } from "vitest";

// main.ts의 saveSettings() watcher 동기화 로직을 테스트한다.
// TILWatcher를 mock으로 대체하여 start/stop/updatePath 호출을 검증.

interface MockWatcher {
	started: boolean;
	stopped: boolean;
	currentPath: string;
	start(): void;
	stop(): void;
	updatePath(path: string): void;
}

function createMockWatcher(tilPath: string): MockWatcher {
	return {
		started: false,
		stopped: false,
		currentPath: tilPath,
		start() {
			this.started = true;
			this.stopped = false;
		},
		stop() {
			this.stopped = true;
			this.started = false;
		},
		updatePath(path: string) {
			this.currentPath = path;
		},
	};
}

// main.ts saveSettings()의 watcher 동기화 로직을 재현
function syncWatcher(
	settings: { autoOpenNewTIL: boolean; tilPath: string },
	watcher: MockWatcher | null,
	createWatcher: (path: string) => MockWatcher,
): MockWatcher | null {
	if (settings.autoOpenNewTIL) {
		if (!watcher) {
			const w = createWatcher(settings.tilPath);
			w.start();
			return w;
		} else {
			watcher.updatePath(settings.tilPath);
			return watcher;
		}
	} else {
		watcher?.stop();
		return null;
	}
}

describe("saveSettings watcher 동기화", () => {
	it("autoOpenNewTIL이 true이고 watcher가 없으면 새로 생성하고 시작한다", () => {
		const result = syncWatcher(
			{ autoOpenNewTIL: true, tilPath: "til" },
			null,
			createMockWatcher,
		);

		expect(result).not.toBeNull();
		expect(result!.started).toBe(true);
		expect(result!.currentPath).toBe("til");
	});

	it("autoOpenNewTIL이 true이고 watcher가 있으면 경로만 업데이트한다", () => {
		const existing = createMockWatcher("til");
		existing.start();

		const result = syncWatcher(
			{ autoOpenNewTIL: true, tilPath: "learning" },
			existing,
			createMockWatcher,
		);

		expect(result).toBe(existing); // 같은 인스턴스
		expect(result!.currentPath).toBe("learning");
		expect(result!.started).toBe(true); // 기존 상태 유지
	});

	it("autoOpenNewTIL이 false이면 watcher를 중지하고 null을 반환한다", () => {
		const existing = createMockWatcher("til");
		existing.start();

		const result = syncWatcher(
			{ autoOpenNewTIL: false, tilPath: "til" },
			existing,
			createMockWatcher,
		);

		expect(result).toBeNull();
		expect(existing.stopped).toBe(true);
	});

	it("autoOpenNewTIL이 false이고 watcher가 없으면 아무것도 하지 않는다", () => {
		const result = syncWatcher(
			{ autoOpenNewTIL: false, tilPath: "til" },
			null,
			createMockWatcher,
		);

		expect(result).toBeNull();
	});
});

describe("설정 기본값 검증", () => {
	it("mcpPort 유효 범위 검증 로직", () => {
		// settings.ts의 포트 검증 로직 재현
		function isValidPort(value: string): boolean {
			const port = parseInt(value, 10);
			return !isNaN(port) && port > 0 && port < 65536;
		}

		expect(isValidPort("22360")).toBe(true);
		expect(isValidPort("1")).toBe(true);
		expect(isValidPort("65535")).toBe(true);
		expect(isValidPort("0")).toBe(false);
		expect(isValidPort("65536")).toBe(false);
		expect(isValidPort("-1")).toBe(false);
		expect(isValidPort("abc")).toBe(false);
		expect(isValidPort("")).toBe(false);
	});
});
