import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadSiteConfig } from "../src/core/config";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("loadSiteConfig", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "config-test-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("oh-my-til.json이 없으면 빈 객체를 반환한다", () => {
		const config = loadSiteConfig(tmpDir);
		expect(config).toEqual({});
	});

	it("유효한 설정 파일을 읽는다", () => {
		const data = {
			deploy: {
				title: "My TIL",
				subtitle: "매일 배운 것을 기록합니다",
				github: "https://github.com/user",
				out: "docs",
				"til-path": "notes",
			},
		};
		fs.writeFileSync(path.join(tmpDir, "oh-my-til.json"), JSON.stringify(data));
		const config = loadSiteConfig(tmpDir);
		expect(config.deploy?.title).toBe("My TIL");
		expect(config.deploy?.subtitle).toBe("매일 배운 것을 기록합니다");
		expect(config.deploy?.github).toBe("https://github.com/user");
		expect(config.deploy?.out).toBe("docs");
		expect(config.deploy?.["til-path"]).toBe("notes");
	});

	it("deploy 키가 없는 설정 파일도 처리한다", () => {
		fs.writeFileSync(path.join(tmpDir, "oh-my-til.json"), "{}");
		const config = loadSiteConfig(tmpDir);
		expect(config).toEqual({});
		expect(config.deploy).toBeUndefined();
	});

	it("잘못된 JSON이면 빈 객체를 반환한다", () => {
		fs.writeFileSync(path.join(tmpDir, "oh-my-til.json"), "not json{");
		const config = loadSiteConfig(tmpDir);
		expect(config).toEqual({});
	});

	it("JSON이 배열이면 빈 객체를 반환한다", () => {
		fs.writeFileSync(path.join(tmpDir, "oh-my-til.json"), "[1,2,3]");
		const config = loadSiteConfig(tmpDir);
		expect(config).toEqual({});
	});

	it("일부 필드만 있는 설정도 읽는다", () => {
		const data = { deploy: { title: "TIL Only" } };
		fs.writeFileSync(path.join(tmpDir, "oh-my-til.json"), JSON.stringify(data));
		const config = loadSiteConfig(tmpDir);
		expect(config.deploy?.title).toBe("TIL Only");
		expect(config.deploy?.subtitle).toBeUndefined();
		expect(config.deploy?.github).toBeUndefined();
	});
});
