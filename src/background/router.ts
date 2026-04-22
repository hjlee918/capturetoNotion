export async function handleMessage(message: unknown): Promise<{ ok: boolean; error?: string }> {
  void message;
  return { ok: false, error: 'Unhandled message type' };
}
