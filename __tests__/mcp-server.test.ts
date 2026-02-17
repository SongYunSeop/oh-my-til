import { describe, it, expect, afterEach } from "vitest";
import * as http from "http";

// MCP 서버의 HTTP 라우팅/CORS/에러 처리를 테스트한다.
// 실제 McpServer 의존성 없이, handleRequest 로직의 핵심 동작만 검증.

// server.ts의 handleRequest 라우팅 로직을 재현
function createTestServer(): http.Server {
	return http.createServer(async (req, res) => {
		// CORS 헤더
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
		res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

		if (req.method === "OPTIONS") {
			res.writeHead(204);
			res.end();
			return;
		}

		if (req.url === "/mcp" || req.url?.startsWith("/mcp?")) {
			// MCP 핸들러 (테스트에서는 간단한 응답으로 대체)
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: true }));
			return;
		}

		res.writeHead(404);
		res.end("Not found");
	});
}

function request(
	port: number,
	options: { method?: string; path?: string },
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
	return new Promise((resolve, reject) => {
		const req = http.request(
			{ hostname: "127.0.0.1", port, method: options.method ?? "GET", path: options.path ?? "/" },
			(res) => {
				let body = "";
				res.on("data", (chunk) => (body += chunk));
				res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body }));
			},
		);
		req.on("error", reject);
		req.end();
	});
}

let server: http.Server | null = null;

function stopServer(): Promise<void> {
	return new Promise((resolve) => {
		if (server) {
			server.close(() => {
				server = null;
				resolve();
			});
		} else {
			resolve();
		}
	});
}

// 매 테스트마다 서버 정리
afterEach(async () => {
	await stopServer();
});

describe("MCP 서버 HTTP 라우팅", () => {
	async function startAndGetPort(): Promise<number> {
		server = createTestServer();
		return new Promise((resolve) => {
			server!.listen(0, "127.0.0.1", () => {
				const addr = server!.address() as { port: number };
				resolve(addr.port);
			});
		});
	}

	it("OPTIONS 요청에 204 + CORS 헤더를 반환한다", async () => {
		const p = await startAndGetPort();
		const res = await request(p, { method: "OPTIONS", path: "/mcp" });

		expect(res.status).toBe(204);
		expect(res.headers["access-control-allow-origin"]).toBe("*");
		expect(res.headers["access-control-allow-methods"]).toContain("POST");
		expect(res.headers["access-control-allow-headers"]).toContain("mcp-session-id");
	});

	it("/mcp 경로에 200을 반환한다", async () => {
		const p = await startAndGetPort();
		const res = await request(p, { method: "POST", path: "/mcp" });

		expect(res.status).toBe(200);
		expect(JSON.parse(res.body)).toEqual({ ok: true });
	});

	it("/mcp?session=xxx 쿼리스트링도 매치한다", async () => {
		const p = await startAndGetPort();
		const res = await request(p, { method: "POST", path: "/mcp?session=abc123" });

		expect(res.status).toBe(200);
	});

	it("다른 경로에 404를 반환한다", async () => {
		const p = await startAndGetPort();
		const res = await request(p, { path: "/" });

		expect(res.status).toBe(404);
	});

	it("/mcp가 아닌 경로에 404를 반환한다", async () => {
		const p = await startAndGetPort();
		const res = await request(p, { path: "/api/something" });

		expect(res.status).toBe(404);
	});

	it("모든 응답에 CORS 헤더가 포함된다", async () => {
		const p = await startAndGetPort();
		const res = await request(p, { path: "/nonexistent" });

		expect(res.headers["access-control-allow-origin"]).toBe("*");
	});
});

describe("MCP 서버 라이프사이클", () => {
	it("시작 후 종료할 수 있다", async () => {
		server = createTestServer();
		await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));

		const addr = server!.address() as { port: number };
		expect(addr.port).toBeGreaterThan(0);

		await stopServer();
		expect(server).toBeNull();
	});

	it("포트 충돌 시 에러를 발생한다", async () => {
		// 첫 번째 서버 시작
		const server1 = createTestServer();
		const port = await new Promise<number>((resolve) => {
			server1.listen(0, "127.0.0.1", () => {
				resolve((server1.address() as { port: number }).port);
			});
		});

		// 같은 포트로 두 번째 서버 시작 시도
		const server2 = createTestServer();
		const error = await new Promise<NodeJS.ErrnoException>((resolve) => {
			server2.on("error", (err) => resolve(err as NodeJS.ErrnoException));
			server2.listen(port, "127.0.0.1");
		});

		expect(error.code).toBe("EADDRINUSE");

		// 정리
		await new Promise<void>((resolve) => server1.close(() => resolve()));
	});
});
