import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { BotMode } from "../utils/types";
import { loadConfig } from "../config/config";
import { getLogger } from "../utils/Logger";
import { ContentSafety } from "../utils/ContentSafety";

const logger = getLogger("chat");

export class MessageGenerator {
  private config = loadConfig();
  private lastPhraseByBot = new Map<string, string>();
  private openai: OpenAI | null = null;

  private reactions = [
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

  private streamerQuestions = [
    "Во что играем?",
    "Какой ранг?",
    "Это сложно?",
    "Что дальше?",
    "Почему так сделал?",
    "А если попробовать иначе?"
  ];

  private chatComments = [
    "Интересно",
    "Захватывающе",
    "Напряженно",
    "Сильный противник",
    "Легкая катка",
    "Красивый момент"
  ];

  private idlePhrases = [
    "круто",
    "го го",
    "давай",
    "упс",
    "ага",
    "хм"
  ];

  private botQuestions = [
    "ты как думаешь?",
    "согласен?",
    "а ты видел это?",
    "что скажешь?"
  ];

  private replies = [
    "Ты прав",
    "Не знаю",
    "Может быть",
    "Хороший вопрос",
    "Согласен",
    "Точно"
  ];

  constructor() {
    this.loadDataset();
  }

  private loadDataset() {
    try {
      const dataPath = path.resolve(process.cwd(), "data", "phrases.json");
      if (fs.existsSync(dataPath)) {
        const fileData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
        if (fileData.reactions) this.reactions = fileData.reactions;
        if (fileData.streamerQuestions) this.streamerQuestions = fileData.streamerQuestions;
        if (fileData.chatComments) this.chatComments = fileData.chatComments;
        if (fileData.idlePhrases) this.idlePhrases = fileData.idlePhrases;
        if (fileData.botQuestions) this.botQuestions = fileData.botQuestions;
        if (fileData.replies) this.replies = fileData.replies;
      } else {
        const defaultData = {
          reactions: this.reactions,
          streamerQuestions: this.streamerQuestions,
          chatComments: this.chatComments,
          idlePhrases: this.idlePhrases,
          botQuestions: this.botQuestions,
          replies: this.replies
        };
        const dir = path.dirname(dataPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2), "utf8");
      }
    } catch (error) {
      logger.error("Failed to load or save phrases.json", { error });
    }
  }

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

  private injectTypo(text: string): string {
    if (Math.random() > 0.05 || text.length < 4) return text;
    const idx = Math.floor(Math.random() * (text.length - 1));
    const arr = text.split("");
    const temp = arr[idx];
    arr[idx] = arr[idx + 1];
    arr[idx + 1] = temp;
    return arr.join("");
  }

  private finalize(text: string): string {
    const cleaned = ContentSafety.clean(text);
    if (!cleaned) return "";
    return this.injectTypo(cleaned);
  }
}