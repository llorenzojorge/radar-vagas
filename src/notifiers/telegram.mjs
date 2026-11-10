const MAX_MESSAGE_LENGTH = 4_000; // Telegram's hard limit is 4,096.
const TIMEOUT_MS = 30_000;

/**
 * Minimal Telegram Bot API client bound to a single chat.
 * Error messages never include the bot token.
 */
export function createTelegramClient({ token, chatId }) {
  async function call(method, payload) {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) {
      throw new Error(`Telegram ${method}: ${response.status} ${body.description ?? ""}`.trim());
    }
    return body.result;
  }

  async function send(html) {
    await call("sendMessage", {
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  }

  return {
    send,

    /** Sends `header` followed by `blocks`, packing them into as few messages as possible. */
    async sendBlocks(header, blocks) {
      let message = header;
      for (const block of blocks) {
        if (message && message.length + block.length + 2 > MAX_MESSAGE_LENGTH) {
          await send(message);
          message = "";
        }
        message += (message ? "\n\n" : "") + block;
      }
      if (message) await send(message);
    },

    /**
     * Returns text commands sent to the bot by the configured chat only,
     * plus the offset that acknowledges every fetched update.
     */
    async readCommands(offset) {
      const updates = await call("getUpdates", { offset, timeout: 0, allowed_updates: ["message"] });
      const commands = updates
        .filter((update) => String(update.message?.chat?.id) === String(chatId))
        .map((update) => update.message.text?.trim() ?? "")
        .filter((text) => text.startsWith("/"));
      const nextOffset = updates.length ? updates.at(-1).update_id + 1 : offset;
      return { commands, nextOffset };
    },
  };
}
