export class ContentSafety {
  private static bannedWords = ["word1", "word2"]; // Replace with your list

  static clean(text: string): string {
    let cleaned = text;
    this.bannedWords.forEach((word) => {
      const regex = new RegExp(word, "gi");
      cleaned = cleaned.replace(regex, "***");
    });
    return cleaned;
  }
}
