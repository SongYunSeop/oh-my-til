import { describe, it, expect, beforeEach } from "vitest";
import { Vault } from "./mock-obsidian";

// skills.ts는 esbuild text import를 사용하므로 직접 import 불가.
// installSkills의 핵심 로직을 직접 테스트한다.
async function installSkills(
	vault: Vault,
	skills: Record<string, string>
): Promise<string[]> {
	const installed: string[] = [];
	for (const [relativePath, content] of Object.entries(skills)) {
		const fullPath = `.claude/skills/${relativePath}`;
		if (await vault.adapter.exists(fullPath)) continue;

		const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
		if (!(await vault.adapter.exists(dir))) {
			await vault.adapter.mkdir(dir);
		}

		await vault.adapter.write(fullPath, content);
		installed.push(fullPath);
	}
	return installed;
}

describe("installSkills", () => {
	let vault: Vault;
	const testSkills: Record<string, string> = {
		"til/SKILL.md": "# TIL Skill",
		"backlog/SKILL.md": "# Backlog Skill",
	};

	beforeEach(() => {
		vault = new Vault();
	});

	it("파일이 없으면 생성한다", async () => {
		const installed = await installSkills(vault, testSkills);
		expect(installed).toContain(".claude/skills/til/SKILL.md");
		expect(installed).toContain(".claude/skills/backlog/SKILL.md");

		const content = await vault.adapter.read(".claude/skills/til/SKILL.md");
		expect(content).toBe("# TIL Skill");
	});

	it("이미 존재하는 파일은 건드리지 않는다", async () => {
		vault._setFile(".claude/skills/til/SKILL.md", "# 커스터마이즈됨");

		const installed = await installSkills(vault, testSkills);
		expect(installed).not.toContain(".claude/skills/til/SKILL.md");
		expect(installed).toContain(".claude/skills/backlog/SKILL.md");

		// 기존 내용이 보존되어야 한다
		const content = await vault.adapter.read(".claude/skills/til/SKILL.md");
		expect(content).toBe("# 커스터마이즈됨");
	});

	it("빈 스킬 목록이면 아무것도 설치하지 않는다", async () => {
		const installed = await installSkills(vault, {});
		expect(installed).toEqual([]);
	});
});
