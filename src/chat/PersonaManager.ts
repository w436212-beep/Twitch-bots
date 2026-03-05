export type PersonaStyle = "helpful" | "funny" | "skeptical" | "fanboy";

export interface Persona {
  id: string;
  name: string;
  style: PersonaStyle;
  prefix?: string;
}

export class PersonaManager {
  private static personas: Persona[] = [
    { id: "1", name: "Скептик", style: "skeptical", prefix: "Ну не знаю... " },
    { id: "2", name: "Фанат", style: "fanboy", prefix: "ОГО! " },
    { id: "3", name: "Шутник", style: "funny" }
  ];

  static getRandomPersona(): Persona {
    return this.personas[Math.floor(Math.random() * this.personas.length)];
  }

  /**
   * Builds a system prompt based on persona style.
   */
  static getSystemPrompt(persona: Persona): string {
    const base = "Ты зритель на Twitch. Пиши коротко, без эмодзи (кроме текстовых :D). ";
    const styles: Record<PersonaStyle, string> = {
      skeptical: "Общайся с недоверием и легким сарказмом.",
      fanboy: "Ты в восторге от происходящего, поддерживай стримера.",
      funny: "Шути и используй молодежный сленг.",
      helpful: "Старайся быть полезным и вежливым."
    };
    const prefixHint = persona.prefix ? ` Начинай ответ с префикса: "${persona.prefix}".` : "";
    return base + styles[persona.style] + prefixHint;
  }
}
