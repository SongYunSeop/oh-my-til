import { describe, it, expect } from "vitest";
import { handleShiftEnter } from "../src/terminal/keyboard";

describe("handleShiftEnter", () => {
	it("Shift+Enter keydown → newline 전송, 기본 동작 차단", () => {
		const result = handleShiftEnter({ key: "Enter", shiftKey: true, type: "keydown" });
		expect(result.sendNewline).toBe(true);
		expect(result.allowDefault).toBe(false);
	});

	it("Shift+Enter keypress → newline 미전송, 기본 동작 차단", () => {
		const result = handleShiftEnter({ key: "Enter", shiftKey: true, type: "keypress" });
		expect(result.sendNewline).toBe(false);
		expect(result.allowDefault).toBe(false);
	});

	it("Shift+Enter keyup → newline 미전송, 기본 동작 차단", () => {
		const result = handleShiftEnter({ key: "Enter", shiftKey: true, type: "keyup" });
		expect(result.sendNewline).toBe(false);
		expect(result.allowDefault).toBe(false);
	});

	it("Enter (Shift 없음) → 기본 동작 허용", () => {
		const result = handleShiftEnter({ key: "Enter", shiftKey: false, type: "keydown" });
		expect(result.sendNewline).toBe(false);
		expect(result.allowDefault).toBe(true);
	});

	it("다른 키 → 기본 동작 허용", () => {
		const result = handleShiftEnter({ key: "a", shiftKey: true, type: "keydown" });
		expect(result.sendNewline).toBe(false);
		expect(result.allowDefault).toBe(true);
	});
});
