"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageGenerator = void 0;
const openai_1 = __importDefault(require("openai"));
const types_1 = require("../utils/types");
const config_1 = require("../config/config");
const Logger_1 = require("../utils/Logger");
const logger = (0, Logger_1.getLogger)("chat");
class MessageGenerator {
    config = (0, config_1.loadConfig)();
    lastPhraseByBot = new Map();
    openai = null;
    reactions = [
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
    streamerQuestions = [
        "Во что играем?",
        "Какой ранг?",
        "Это сложно?",
        "Что дальше?",
        "Почему так сделал?",
        "А если попробовать иначе?"
    ];
    chatComments = [
        "Интересно",
        "Захватывающе",
        "Напряженно",
        "Сильный противник",
        "Легкая катка",
        "Красивый момент"
    ];
    idlePhrases = [
        "круто",
        "го го",
        "давай",
        "упс",
        "ага",
        "хм"
    ];
    botQuestions = [
        "ты как думаешь?",
        "согласен?",
        "а ты видел это?",
        "что скажешь?"
    ];
    replies = [
        "Ты прав",
        "Не знаю",
        "Может быть",
        "Хороший вопрос",
        "Согласен",
        "Точно"
    ];
    generateReaction(botId) {
        return this.pick(botId, this.reactions);
    }
    generateStreamerQuestion(botId) {
        return this.pick(botId, this.streamerQuestions);
    }
    generateChatComment(botId) {
        return this.pick(botId, this.chatComments);
    }
    generateIdle(botId) {
        return this.pick(botId, this.idlePhrases);
    }
    generateBotQuestion(botId) {
        return this.pick(botId, this.botQuestions);
    }
    generateReply(botId) {
        return this.pick(botId, this.replies);
    }
    pick(botId, list) {
        if (list.length === 0)
            return "";
        const last = this.lastPhraseByBot.get(botId);
        const options = list.filter((item) => item !== last);
        const chosen = (options.length > 0 ? options : list)[Math.floor(Math.random() * list.length)];
        this.lastPhraseByBot.set(botId, chosen);
        return chosen;
    }
    async generateAi(prompt) {
        if (this.config.mode !== types_1.BotMode.AI || !this.config.openAiApiKey)
            return null;
        try {
            if (!this.openai) {
                this.openai = new openai_1.default({ apiKey: this.config.openAiApiKey });
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
            return text || null;
        }
        catch (error) {
            logger.error("AI generation failed", { error });
            return null;
        }
    }
}
exports.MessageGenerator = MessageGenerator;
