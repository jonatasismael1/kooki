export function log(event: string, values: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), service: "kooki-media-worker", event, ...values }));
}
export function logError(event: string, error: unknown, values: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: "kooki-media-worker", event,
    ...values, error: error instanceof Error ? error.message : "unknown",
    stack: error instanceof Error ? error.stack : undefined }));
}
