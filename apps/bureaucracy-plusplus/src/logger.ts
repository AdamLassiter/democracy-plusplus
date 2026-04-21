export function logEvent(event: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  if (!details || Object.keys(details).length === 0) {
    console.log(`[${timestamp}] ${event}`);
    return;
  }

  console.log(`[${timestamp}] ${event}`, details);
}
