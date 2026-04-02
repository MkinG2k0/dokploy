import { useEffect, useRef, useState } from "react";
import { TerminalLine } from "@/components/dashboard/docker/logs/terminal-line";
import { type LogLine, parseLogs } from "@/components/dashboard/docker/logs/utils";

interface OnboardingDeployLogProps {
	logPath: string | null;
	serverId: string | undefined;
	open: boolean;
}

export const OnboardingDeployLog = ({
	logPath,
	serverId,
	open,
}: OnboardingDeployLogProps) => {
	const [data, setData] = useState("");
	const [filteredLogs, setFilteredLogs] = useState<LogLine[]>([]);
	const scrollRef = useRef<HTMLDivElement>(null);
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		if (!open || !logPath) return;

		setData("");
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/listen-deployment?logPath=${encodeURIComponent(logPath)}${serverId ? `&serverId=${encodeURIComponent(serverId)}` : ""}`;
		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;

		ws.onmessage = (e) => {
			setData((prev) => prev + String(e.data));
		};

		return () => {
			if (wsRef.current?.readyState === WebSocket.OPEN) {
				wsRef.current.close();
			}
			wsRef.current = null;
		};
	}, [logPath, open, serverId]);

	useEffect(() => {
		setFilteredLogs(parseLogs(data));
	}, [data]);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [filteredLogs]);

	if (!open || !logPath) {
		return null;
	}

	return (
		<div
			ref={scrollRef}
			className="bg-muted max-h-80 overflow-y-auto rounded-md border p-3 font-mono text-xs"
		>
			<pre className="whitespace-pre-wrap break-all">
				{filteredLogs.map((line, i) => (
					<TerminalLine
						key={`${line.rawTimestamp ?? ""}-${i}`}
						log={line}
						noTimestamp
					/>
				))}
			</pre>
		</div>
	);
};
