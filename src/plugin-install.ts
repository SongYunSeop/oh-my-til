import type { FileStorage } from "./ports/storage";

// esbuild의 text loader로 번들에 포함
import tilSkill from "../vault-assets/skills/til/SKILL.md";
import backlogSkill from "../vault-assets/skills/backlog/SKILL.md";
import researchSkill from "../vault-assets/skills/research/SKILL.md";
import saveSkill from "../vault-assets/skills/save/SKILL.md";
import migrateLinksSkill from "../vault-assets/skills/migrate-links/SKILL.md";
import dashboardSkill from "../vault-assets/skills/dashboard/SKILL.md";
import claudeMdSection from "../vault-assets/claude-md-section.md";

import tilResearcherAgent from "../vault-assets/agents/til-researcher.md";
import tilFetcherAgent from "../vault-assets/agents/til-fetcher.md";
import tilQualityCheckerAgent from "../vault-assets/agents/til-quality-checker.md";
import tilFileUpdaterAgent from "../vault-assets/agents/til-file-updater.md";
import tilResearchReviewerAgent from "../vault-assets/agents/til-research-reviewer.md";
import tilCrossLinkerAgent from "../vault-assets/agents/til-cross-linker.md";

import {
	resolveVersionPlaceholder,
	extractPluginVersion,
	isNewerVersion,
	escapeRegExp,
	SKILLS_BASE,
	RULES_BASE,
	AGENTS_BASE,
	OLD_SKILLS_BASE,
	MCP_MARKER_START,
	MCP_MARKER_END,
} from "./core/skills";

export { resolveVersionPlaceholder, extractPluginVersion, isNewerVersion };

const SKILLS: Record<string, string> = {
	"til/SKILL.md": tilSkill,
	"backlog/SKILL.md": backlogSkill,
	"research/SKILL.md": researchSkill,
	"save/SKILL.md": saveSkill,
	"migrate-links/SKILL.md": migrateLinksSkill,
	"dashboard/SKILL.md": dashboardSkill,
};

const RULES: Record<string, string> = {};

const AGENTS: Record<string, string> = {
	"til-researcher.md": tilResearcherAgent,
	"til-fetcher.md": tilFetcherAgent,
	"til-quality-checker.md": tilQualityCheckerAgent,
	"til-file-updater.md": tilFileUpdaterAgent,
	"til-research-reviewer.md": tilResearchReviewerAgent,
	"til-cross-linker.md": tilCrossLinkerAgent,
};


/**
 * 버전 관리 파일을 설치/업데이트하는 공통 로직.
 *
 * - 파일이 없으면 새로 설치
 * - plugin-version이 현재보다 낮으면 업데이트
 * - plugin-version이 없으면 사용자 커스터마이즈로 간주, 건너뜀
 */
async function installFiles(
	storage: FileStorage,
	basePath: string,
	files: Record<string, string>,
	pluginVersion: string,
	label: string,
): Promise<void> {
	// 필요한 디렉토리를 사전에 수집하여 중복 없이 생성
	const dirs = new Set<string>();
	for (const relativePath of Object.keys(files)) {
		const fullPath = `${basePath}/${relativePath}`;
		dirs.add(fullPath.substring(0, fullPath.lastIndexOf("/")));
	}
	for (const dir of dirs) {
		if (!(await storage.exists(dir))) {
			await storage.mkdir(dir);
		}
	}

	await Promise.all(
		Object.entries(files).map(async ([relativePath, content]) => {
			const fullPath = `${basePath}/${relativePath}`;

			if (await storage.exists(fullPath)) {
				const existing = await storage.readFile(fullPath);
				const installedVersion = extractPluginVersion(existing ?? "");

				// plugin-version이 없으면 사용자 커스터마이즈 → 건너뜀
				if (!installedVersion) return;
				// 현재 버전이 더 높지 않으면 건너뜀
				if (!isNewerVersion(pluginVersion, installedVersion)) return;
			}

			await storage.writeFile(fullPath, resolveVersionPlaceholder(content, pluginVersion));
			console.log(`Oh My TIL: ${label} 설치됨 → ${fullPath}`);
		}),
	);
}

/**
 * vault에 플러그인 에셋(skills, agents, CLAUDE.md 섹션)을 설치/업데이트한다.
 */
export async function installPlugin(storage: FileStorage, pluginVersion: string): Promise<void> {
	// 병렬 실행 전에 공유 부모 디렉토리 생성 (race condition 방지)
	if (!(await storage.exists(".claude"))) {
		await storage.mkdir(".claude");
	}
	await Promise.all([
		installFiles(storage, SKILLS_BASE, SKILLS, pluginVersion, "skill"),
		installFiles(storage, RULES_BASE, RULES, pluginVersion, "rule"),
		installFiles(storage, AGENTS_BASE, AGENTS, pluginVersion, "agent"),
	]);

	await installClaudeMdSection(storage, pluginVersion);
	await cleanupOldSkills(storage);
}

/**
 * .claude/CLAUDE.md에 MCP 도구 안내 섹션을 추가/업데이트한다.
 * 마커 주석(버전 포함)으로 관리하여 기존 내용을 보존한다.
 */
async function installClaudeMdSection(storage: FileStorage, pluginVersion: string): Promise<void> {
	const filePath = ".claude/CLAUDE.md";
	const markerStart = `${MCP_MARKER_START}:${pluginVersion}`;
	const section = `${markerStart}\n${claudeMdSection}\n${MCP_MARKER_END}`;

	if (!(await storage.exists(".claude"))) {
		await storage.mkdir(".claude");
	}

	if (await storage.exists(filePath)) {
		const existing = await storage.readFile(filePath);
		const existingContent = existing ?? "";

		if (existingContent.includes(markerStart)) return; // 같은 버전 이미 설치됨

		// 이전 버전 마커가 있으면 교체
		if (existingContent.includes(MCP_MARKER_START)) {
			const replaced = existingContent.replace(
				new RegExp(`${escapeRegExp(MCP_MARKER_START)}[\\s\\S]*?${escapeRegExp(MCP_MARKER_END)}`),
				section,
			);
			await storage.writeFile(filePath, replaced);
		} else {
			await storage.writeFile(filePath, existingContent.trimEnd() + "\n\n" + section + "\n");
		}
	} else {
		await storage.writeFile(filePath, section + "\n");
	}

	console.log("Oh My TIL: CLAUDE.md에 MCP 도구 안내 추가됨");
}

/**
 * 이전 패키지명(claude-til)으로 설치된 skill 파일을 정리한다.
 * OLD_SKILLS_BASE = ".claude/skills/claude-til" 경로 대상 (의도적 레거시 마이그레이션).
 * plugin-version이 있는 파일만 삭제 (사용자 커스터마이즈 보호).
 */
async function cleanupOldSkills(storage: FileStorage): Promise<void> {
	const oldPaths = ["til/SKILL.md", "backlog/SKILL.md", "research/SKILL.md"];
	for (const relativePath of oldPaths) {
		const oldPath = `${OLD_SKILLS_BASE}/${relativePath}`;
		if (!(await storage.exists(oldPath))) continue;

		const content = await storage.readFile(oldPath);
		const version = extractPluginVersion(content ?? "");
		if (version) {
			await storage.remove(oldPath);
			console.log(`Oh My TIL: 이전 skill 삭제 → ${oldPath}`);
		}
	}
}
