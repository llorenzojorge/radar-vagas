const ENABLE = new Set(["on", "sim", "ligar"]);
const DISABLE = new Set(["off", "nao", "não", "desligar"]);

export const describeToggle = (enabled) => (enabled ? "✅ exibidas" : "🚫 ocultas");

/** Effective international toggle: runtime override first, then configuration. */
export const internationalEnabled = (state, config) => state.includeInternational ?? config.includeInternational;

/**
 * Applies bot commands to the state and returns the replies to send.
 *
 * Supported:
 *   /internacionais [on|off]   toggle (or set) international jobs
 *   /status                    current settings
 *
 * @param {string[]} commands
 * @param {import("../core/types.mjs").State} state
 * @param {import("../core/types.mjs").RadarConfig} config
 * @returns {string[]} Telegram HTML replies.
 */
export function applyCommands(commands, state, config) {
  const replies = [];
  for (const raw of commands) {
    // "/cmd@BotName arg" → ["/cmd", "arg"]
    const [command, argument = ""] = raw.toLowerCase().replace(/@\S+/, "").split(/\s+/);

    if (command === "/internacionais") {
      const enabled = ENABLE.has(argument) ? true
        : DISABLE.has(argument) ? false
        : !internationalEnabled(state, config);
      state.includeInternational = enabled;
      replies.push(`🌎 Vagas internacionais: <b>${describeToggle(enabled)}</b>.`);
    } else if (command === "/status" || command === "/start" || command === "/ajuda") {
      replies.push(
        "📊 <b>Radar de Vagas</b>\n" +
        `Vagas internacionais: ${describeToggle(internationalEnabled(state, config))}\n` +
        `Vagas notificadas (últimos 45 dias): ${Object.keys(state.seen).length}\n\n` +
        "<b>Comandos</b>\n" +
        "/internacionais: alterna a exibição\n" +
        "/internacionais on | off\n" +
        "/status: configuração atual",
      );
    }
  }
  return replies;
}
