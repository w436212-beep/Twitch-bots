import OpenAI from "openai";
import crypto from "crypto";
import { AppConfig, Message } from "../utils/types";
import { Database } from "../database/Database";
import { getLogger } from "../utils/Logger";
import { Persona, PersonaManager } from "../chat/PersonaManager";

const logger = getLogger("ai");

const SYSTEM_PROMPT = `Ты — обычный зритель Twitch стрима Dota 2. Тебе 18-25 лет, ты играешь в Доту, смотришь стримы.

ЖЕСТКИЕ ПРАВИЛА:

ЯЗЫК И СТИЛЬ:

Пиши как подросток в чате Twitch

Русский язык с игровым сленгом

БЕЗ заглавных букв в начале (кроме имен героев)

БЕЗ точек в конце (иногда можно)

Используй сокращения: "хз", "норм", "кста", "имба", "тп", "го", "дд", "бб", "кек", "лол"

Можно легкие опечатки: "сичас", "харош", "ващет", "щас"

ДЛИНА ОТВЕТА:

СТРОГО от 5 до 15 слов

Максимум два коротких предложения

Если не можешь ответить коротко — не отвечай вообще

ТЕМЫ РАЗГОВОРА:

DOTA 2 (основная тема):

Герои: "бруда имба", "па сильный", "инвокер сложный", "пудж фан", "ам фармит быстро"

Мета: "щас танки в мете", "магов много", "керри сильные", "саппорты слабые"

MMR и тактика: "играй керри", "смотри карту", "фарми больше", "пушь лайны", "покупай варды"

Катки: "выиграл пару катек", "слился в ранкед", "тиммейты дауны", "нормальная катка была"

CASUAL темы:

Приветствия: "привет", "здарова", "йоу"

Настроение: "норм работал сижу смотрю", "устал чет", "да нормально", "заебался сегодня"

Встречные вопросы: "у тебя как?", "что делаешь?", "играл сегодня?", "на чем катаешь?"

ЗАПРЕЩЕНО:

Длинные предложения (больше 15 слов) — СТРОГО ЗАПРЕЩЕНО

Умные рассуждения и анализ

Подробные советы с объяснениями

Сложные вопросы которые требуют развернутых ответов

Формальный язык

Bot-language типа "Согласен с вами", "Я рекомендую", "По моему мнению", "Давайте обсудим"

Эмодзи (редко можно простые: ")" или ":D")

ПРИМЕРЫ ПРАВИЛЬНЫХ ОТВЕТОВ:

Вопрос: "какой герой сейчас в мете?"
Ответ: "хз бруда норм па тоже сильный"

Вопрос: "на ком поднимать ммр?"
Ответ: "играй керри смотри за картой"

Вопрос: "че как у вас дела?"
Ответ: "да норм работал сижу смотрю, у тебя как"

Вопрос: "поиграл сегодня?"
Ответ: "ага накидал пару катек слился"

Вопрос: "кто сильнее па или ам?"
Ответ: "па имба щас в мете ам долго фармит"

Вопрос: "что делаешь?"
Ответ: "сижу стрим смотрю отдыхаю"

Вопрос: "бруда имба?"
Ответ: "ага сильный щас"

ПРОДОЛЖЕНИЕ ДИАЛОГА:

Если вопрос casual ("как дела?", "что делаешь?") — МОЖЕШЬ добавить встречный вопрос в конце

Если вопрос про игру (герои, мета) — НЕ ПРОДОЛЖАЙ диалог, просто дай короткий ответ

ВАЖНО:

Ты обычный зритель, НЕ эксперт

Можешь не знать ответа: "хз", "не знаю", "не помню"

Не давай советы если не уверен

Отвечай просто и по-человечески

ТВОЙ ОТВЕТ: Одно короткое сообщение от 5 до 15 слов, максимально простое и естественное.`;

export class AIService {
  private openai: OpenAI | null = null;
  private enabled = false;
  private apiKey = "";
  private model = "gpt-4o-mini";
  private botNames: Set<string> = new Set();
  private onCostIncrement?: (delta: number) => void;
  private onUsageIncrement?: (data: { promptTokens: number; completionTokens: number; cacheHit: boolean }) => void;
  private db?: Database;
  private readonly cacheTtlMs = 3 * 60 * 60 * 1000;
  private readonly personaByBot = new Map<string, Persona>();

  constructor(
    config: AppConfig,
    botNames: string[],
    onCostIncrement?: (delta: number) => void,
    onUsageIncrement?: (data: { promptTokens: number; completionTokens: number; cacheHit: boolean }) => void,
    db?: Database
  ) {
    this.onCostIncrement = onCostIncrement;
    this.onUsageIncrement = onUsageIncrement;
    this.db = db;
    this.updateConfig(config);
    this.setBotNames(botNames);
  }

  updateConfig(config: AppConfig): void {
    this.enabled = Boolean(config.aiEnabled);
    this.apiKey = config.aiApiKey ?? "";
    this.model = config.aiModel ?? "gpt-4o-mini";
    if (this.enabled && this.apiKey) {
      this.openai = new OpenAI({ apiKey: this.apiKey });
    } else {
      this.openai = null;
    }
  }

  setBotNames(botNames: string[]): void {
    this.botNames = new Set(botNames.map((name) => name.toLowerCase()));
  }

  isBotMessage(username: string): boolean {
    return this.botNames.has(username.toLowerCase());
  }

  async generateResponse(lastMessages: Message[], respondingBotName: string): Promise<string | null> {
    if (!this.enabled || !this.openai) return null;

    try {
      const context = lastMessages
        .slice(-5)
        .map((m) => `${m.author}: ${m.text}`)
        .join("\n");

      const userPrompt = `Контекст чата:\n${context}\n\nОтветь от имени ${respondingBotName}.`;
      const persona = this.getPersonaForBot(respondingBotName);
      const systemPrompt = `${PersonaManager.getSystemPrompt(persona)}\n\n${SYSTEM_PROMPT}`;
      const cacheKey = this.hashPrompt(`${this.model}\n${systemPrompt}\n${userPrompt}`);
      const nowMs = Date.now();

      if (this.db) {
        const cached = this.db.getAiCache(cacheKey, nowMs);
        if (cached) {
          this.onUsageIncrement?.({ promptTokens: 0, completionTokens: 0, cacheHit: true });
          return cached;
        }
      }

      const response = await this.openai.chat.completions.create({
        model: this.model,
        max_tokens: 50,
        temperature: 0.9,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      const usage = response.usage;
      if (usage) {
        const promptTokens = usage.prompt_tokens ?? 0;
        const completionTokens = usage.completion_tokens ?? 0;
        const cost =
          (promptTokens * 0.15) / 1_000_000 +
          (completionTokens * 0.60) / 1_000_000;
        if (cost > 0) {
          this.onCostIncrement?.(cost);
        }
        this.onUsageIncrement?.({ promptTokens, completionTokens, cacheHit: false });
      } else {
        this.onUsageIncrement?.({ promptTokens: 0, completionTokens: 0, cacheHit: false });
      }

      const text = response.choices[0]?.message?.content?.trim() ?? "";
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length < 5 || words.length > 20) {
        logger.warn("AI response rejected due to length", { words: words.length, text });
        return null;
      }
      if (this.db) {
        this.db.setAiCache(cacheKey, userPrompt, text, nowMs, this.cacheTtlMs);
      }
      return text;
    } catch (error) {
      logger.error("AI response failed", { error });
      return null;
    }
  }

  private getPersonaForBot(botName: string): Persona {
    const key = botName.toLowerCase();
    const existing = this.personaByBot.get(key);
    if (existing) return existing;
    const persona = PersonaManager.getRandomPersona();
    this.personaByBot.set(key, persona);
    return persona;
  }

  private hashPrompt(value: string): string {
    return crypto.createHash("sha256").update(value, "utf8").digest("hex");
  }
}
