import OpenAI from "openai";
import { BotMode } from "../utils/types";
import { loadConfig } from "../config/config";
import { getLogger } from "../utils/Logger";
import { ContentSafety } from "../utils/ContentSafety";

const logger = getLogger("chat");

export class MessageGenerator {
  private readonly config = loadConfig();
  private readonly lastPhraseByBot = new Map<string, string>();
  private openai: OpenAI | null = null;

  private readonly reactions = [
    "лол",
    "кек",
    "ахахах",
    "жесть",
    "красава",
    "топ",
    "найс",
    "согласен",
    "плюс",
    "да",
    "точно"
  ];

  private readonly streamerQuestions = [
    "Во что играем?",
    "Какой ранг?",
    "Это сложно?",
    "Что дальше?",
    "Почему так сделал?",
    "А если попробовать иначе?"
  ];

  private readonly chatComments = [
    "Интересно",
    "Захватывающе",
    "Напряженно",
    "Сильный противник",
    "Легкая катка",
    "Красивый момент"
  ];

  private readonly idlePhrases = [
    "круто",
    "го го",
    "давай",
    "упс",
    "ага",
    "хм"
  ];

  private readonly botQuestions = [
    "ты как думаешь?",
    "согласен?",
    "а ты видел это?",
    "что скажешь?"
  ];

  private readonly replies = [
    "Ты прав",
    "Не знаю",
    "Может быть",
    "Хороший вопрос",
    "Согласен",
    "Точно"
  ];

  generateReaction(botId: string): string {
    return this.finalize(this.pick(botId, this.reactions));
  }

  generateStreamerQuestion(botId: string): string {
    return this.finalize(this.pick(botId, this.streamerQuestions));
  }

  generateChatComment(botId: string): string {
    return this.finalize(this.pick(botId, this.chatComments));
  }

  generateIdle(botId: string): string {
    return this.finalize(this.pick(botId, this.idlePhrases));
  }

  generateBotQuestion(botId: string): string {
    return this.finalize(this.pick(botId, this.botQuestions));
  }

  generateReply(botId: string): string {
    return this.finalize(this.pick(botId, this.replies));
  }

  private pick(botId: string, list: string[]): string {
    if (list.length === 0) return "";
    const last = this.lastPhraseByBot.get(botId);
    const options = list.filter((item) => item !== last);
    const chosen = (options.length > 0 ? options : list)[Math.floor(Math.random() * list.length)];
    this.lastPhraseByBot.set(botId, chosen);
    return chosen;
  }

  async generateAi(prompt: string): Promise<string | null> {
    if (this.config.mode !== BotMode.AI || !this.config.openAiApiKey) return null;
    try {
      if (!this.openai) {
        this.openai = new OpenAI({ apiKey: this.config.openAiApiKey });
      }
      const response = await this.openai.chat.completions.create({
        model: this.config.openAiModel,
        max_tokens: this.config.openAiMaxTokens,
        temperature: this.config.openAiTemperature,
        top_p: this.config.openAiTopP,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Твой ответ:" }
        ]
      });
      const text = response.choices[0]?.message?.content?.trim() ?? "";
      const cleaned = this.finalize(text);
      return cleaned || null;
    } catch (error) {
      logger.error("AI generation failed", { error });
      return null;
    }
  }

  private finalize(text: string): string {
    return ContentSafety.clean(text);
  }
}
