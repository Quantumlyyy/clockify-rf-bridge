export type ToastrLevel = 'info' | 'warning' | 'success' | 'error';

export function toastrPop(level: ToastrLevel, message: string): void {
	window.top?.postMessage({ type: 'toastrPop', level, message }, '*');
}

export function refreshAddonToken(): void {
	window.top?.postMessage({ type: 'refreshAddonToken' }, '*');
}
