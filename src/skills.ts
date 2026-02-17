import { Vault } from "obsidian";

// esbuild의 text loader로 번들에 포함
import tilSkill from "../skills/til/SKILL.md";
import backlogSkill from "../skills/backlog/SKILL.md";
import researchSkill from "../skills/research/SKILL.md";
import claudeMdSection from "../skills/claude-md-section.md";

const SKILLS: Record<string, string> = {
	"til/SKILL.md": tilSkill,
	"backlog/SKILL.md": backlogSkill,
	"research/SKILL.md": researchSkill,
};

const MCP_MARKER_START = "<!-- claude-til:mcp-tools:start -->";
const MCP_MARKER_END = "<!-- claude-til:mcp-tools:end -->";

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

	await installClaudeMdSection(vault);
}

/**
 * .claude/CLAUDE.md에 MCP 도구 안내 섹션을 추가한다.
 * 마커 주석으로 관리하여 기존 내용을 보존하고 중복 추가를 방지한다.
 */
async function installClaudeMdSection(vault: Vault): Promise<void> {
	const filePath = ".claude/CLAUDE.md";
	const section = `${MCP_MARKER_START}\n${claudeMdSection}\n${MCP_MARKER_END}`;

	if (!(await vault.adapter.exists(".claude"))) {
		await vault.adapter.mkdir(".claude");
	}

	if (await vault.adapter.exists(filePath)) {
		const existing = await vault.adapter.read(filePath);
		if (existing.includes(MCP_MARKER_START)) return; // 이미 설치됨
		await vault.adapter.write(filePath, existing.trimEnd() + "\n\n" + section + "\n");
	} else {
		await vault.adapter.write(filePath, section + "\n");
	}

	console.log("Claude TIL: CLAUDE.md에 MCP 도구 안내 추가됨");
}
