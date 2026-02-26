import * as path from "path";
import * as fs from "fs";

export interface SiteConfig {
	deploy?: {
		"til-path"?: string;
		out?: string;
		title?: string;
		subtitle?: string;
		github?: string;
	};
}

/**
 * vault 루트의 oh-my-til.json 설정 파일을 읽는다.
 * 파일이 없거나 파싱 실패 시 빈 객체를 반환한다.
 */
export function loadSiteConfig(basePath: string): SiteConfig {
	const configPath = path.join(basePath, "oh-my-til.json");
	try {
		const raw = fs.readFileSync(configPath, "utf-8");
		const parsed = JSON.parse(raw);
		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
