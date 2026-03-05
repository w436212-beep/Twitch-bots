export class ContentSafety {
  private static bannedWords = [
    "ниггер", "nigger", "nigga", "faggot", "пидор", "педик",
    "хохол", "кацап", "чурка", "хач", "жид", "шлюха", "даун",
    "аутист", "retard", "rape", "изнасилование", "свастика",
    "hitler", "гитлер", "куколд", "cuck", "kys", "убейся", "суицид", "suicide"
  ];

  static clean(text: string): string {
    const lower = text.toLowerCase();
    for (const word of this.bannedWords) {
      if (lower.includes(word)) {
        return ""; // Drop message completely
      }
    }
    return text;
  }
}