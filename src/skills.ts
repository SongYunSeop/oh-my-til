import { Vault } from "obsidian";

// esbuild의 text loader로 번들에 포함
import tilSkill from "../skills/til/SKILL.md";
import backlogSkill from "../skills/backlog/SKILL.md";
import researchSkill from "../skills/research/SKILL.md";

const SKILLS: Record<string, string> = {
	"til/SKILL.md": tilSkill,
	"backlog/SKILL.md": backlogSkill,
	"research/SKILL.md": researchSkill,
};

/**
 * vault의 .claude/skills/ 에 skill 파일이 없으면 자동 설치한다.
 * 이미 존재하는 파일은 건드리지 않는다 (사용자 커스터마이즈 보호).
 */
export async function installSkills(vault: Vault): Promise<void> {
	for (const [relativePath, content] of Object.entries(SKILLS)) {
		const fullPath = `.claude/skills/${relativePath}`;
		if (await vault.adapter.exists(fullPath)) continue;

		// 디렉토리 생성
		const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
		if (!(await vault.adapter.exists(dir))) {
			await vault.adapter.mkdir(dir);
		}

		await vault.adapter.write(fullPath, content);
		console.log(`Claude TIL: skill 설치됨 → ${fullPath}`);
	}
}
