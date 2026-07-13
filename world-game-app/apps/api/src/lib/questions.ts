import { createAnswerToken } from "./answerToken";
import { poolForDifficulty, type Country } from "./countries";

export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType =
  | "flag"
  | "capital"
  | "continent"
  | "currency"
  | "dish"
  | "language"
  | "tld"
  | "government"
  | "independence"
  | "symbol"
  | "density"
  | "religion";

export interface GeneratedQuestion {
  id: string;
  difficulty: Difficulty;
  level: number;
  type: QuestionType;
  prompt: string;
  options: string[];
  token: string;
  flagImage: string | null;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const picked: T[] = [];
  while (picked.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(idx, 1)[0]!);
  }
  return picked;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

const TYPES_BY_DIFFICULTY: Record<Difficulty, QuestionType[]> = {
  easy: ["flag", "capital", "continent", "tld", "religion"],
  medium: [
    "flag",
    "capital",
    "currency",
    "continent",
    "government",
    "density",
    "religion",
  ],
  hard: [
    "flag",
    "capital",
    "currency",
    "dish",
    "language",
    "tld",
    "government",
    "independence",
    "density",
    "religion",
  ],
};

function buildOptionsAndPrompt(
  type: QuestionType,
  answer: Country,
  pool: Country[],
): { prompt: string; correctAnswer: string; distractors: string[] } | null {
  const distractPool = pool.filter((c) => c.country !== answer.country);

  switch (type) {
    case "flag": {
      const distractors = pickRandom(distractPool, 3).map((c) => c.country);
      if (distractors.length < 3) return null;
      return {
        prompt: "Which country does this flag belong to?",
        correctAnswer: answer.country,
        distractors,
      };
    }
    case "capital": {
      const distractors = pickRandom(distractPool, 3).map((c) => c.capital);
      if (distractors.length < 3) return null;
      return {
        prompt: `What is the capital of ${answer.country}?`,
        correctAnswer: answer.capital,
        distractors,
      };
    }
    case "continent": {
      const distractors = shuffle(
        Array.from(
          new Set(
            distractPool
              .map((c) => c.continent)
              .filter((c) => c !== answer.continent),
          ),
        ),
      ).slice(0, 3);
      if (distractors.length < 3) return null;
      return {
        prompt: `Which continent is ${answer.country} located in?`,
        correctAnswer: answer.continent,
        distractors,
      };
    }
    case "currency": {
      if (!answer.currencyName) return null;
      const distractors = shuffle(
        Array.from(
          new Set(
            distractPool
              .map((c) => c.currencyName)
              .filter((c): c is string => !!c && c !== answer.currencyName),
          ),
        ),
      ).slice(0, 3);
      if (distractors.length < 3) return null;
      return {
        prompt: `What is the official currency of ${answer.country}?`,
        correctAnswer: answer.currencyName,
        distractors,
      };
    }
    case "dish": {
      if (!answer.dish) return null;
      const distractors = shuffle(
        Array.from(
          new Set(
            distractPool
              .map((c) => c.dish)
              .filter((c): c is string => !!c && c !== answer.dish),
          ),
        ),
      ).slice(0, 3);
      if (distractors.length < 3) return null;
      return {
        prompt: `Which national dish comes from ${answer.country}?`,
        correctAnswer: answer.dish,
        distractors,
      };
    }
    case "language": {
      if (!answer.languages.length) return null;
      const correctAnswer = answer.languages[0]!;
      const distractors = shuffle(
        Array.from(
          new Set(
            distractPool
              .flatMap((c) => c.languages)
              .filter((l) => !answer.languages.includes(l)),
          ),
        ),
      ).slice(0, 3);
      if (distractors.length < 3) return null;
      return {
        prompt: `Which language is spoken in ${answer.country}?`,
        correctAnswer,
        distractors,
      };
    }
    case "tld": {
      if (!answer.tld) return null;
      const distractors = shuffle(
        Array.from(
          new Set(
            distractPool
              .map((c) => c.tld)
              .filter((c): c is string => !!c && c !== answer.tld),
          ),
        ),
      ).slice(0, 3);
      if (distractors.length < 3) return null;
      return {
        prompt: `What is the internet domain (TLD) of ${answer.country}?`,
        correctAnswer: answer.tld,
        distractors,
      };
    }
    case "government": {
      if (!answer.government) return null;
      const distractors = shuffle(
        Array.from(
          new Set(
            distractPool
              .map((c) => c.government)
              .filter((c): c is string => !!c && c !== answer.government),
          ),
        ),
      ).slice(0, 3);
      if (distractors.length < 3) return null;
      return {
        prompt: `What type of government does ${answer.country} have?`,
        correctAnswer: answer.government,
        distractors,
      };
    }
    case "independence": {
      if (answer.independence === null) return null;
      const distractors = shuffle(
        Array.from(
          new Set(
            distractPool
              .map((c) => c.independence)
              .filter(
                (c): c is number => c !== null && c !== answer.independence,
              ),
          ),
        ),
      )
        .slice(0, 3)
        .map((y) => String(y));
      if (distractors.length < 3) return null;
      return {
        prompt: `In what year did ${answer.country} gain independence?`,
        correctAnswer: String(answer.independence),
        distractors,
      };
    }
    case "symbol": {
      if (!answer.symbol) return null;
      const distractors = shuffle(
        Array.from(
          new Set(
            distractPool
              .map((c) => c.symbol)
              .filter((c): c is string => !!c && c !== answer.symbol),
          ),
        ),
      ).slice(0, 3);
      if (distractors.length < 3) return null;
      return {
        prompt: `What is the national symbol of ${answer.country}?`,
        correctAnswer: answer.symbol,
        distractors,
      };
    }
    case "density": {
      if (answer.populationDensity === null) return null;
      const distractors = shuffle(
        Array.from(
          new Set(
            distractPool
              .map((c) => c.populationDensity)
              .filter(
                (c): c is number =>
                  c !== null && c !== answer.populationDensity,
              ),
          ),
        ),
      )
        .slice(0, 3)
        .map((d) => `${d.toFixed(1)} people/km²`);
      if (distractors.length < 3) return null;
      return {
        prompt: `What is the approximate population density of ${answer.country}?`,
        correctAnswer: `${answer.populationDensity.toFixed(1)} people/km²`,
        distractors,
      };
    }
    case "religion": {
      if (!answer.religion) return null;
      const distractors = shuffle(
        Array.from(
          new Set(
            distractPool
              .map((c) => c.religion)
              .filter((c): c is string => !!c && c !== answer.religion),
          ),
        ),
      ).slice(0, 3);
      if (distractors.length < 3) return null;
      return {
        prompt: `What is the predominant religion in ${answer.country}?`,
        correctAnswer: answer.religion,
        distractors,
      };
    }
  }
}

export function generateQuestion(
  difficulty: Difficulty,
  level: number,
): GeneratedQuestion {
  const pool = poolForDifficulty(difficulty);
  const candidateTypes = TYPES_BY_DIFFICULTY[difficulty];

  // Try a handful of random (country, type) combinations until one has
  // enough distinct distractors to build a full 4-option question.
  for (let attempt = 0; attempt < 40; attempt++) {
    const answer = pool[Math.floor(Math.random() * pool.length)]!;
    const type =
      candidateTypes[Math.floor(Math.random() * candidateTypes.length)]!;
    const built = buildOptionsAndPrompt(type, answer, pool);
    if (!built) continue;

    const options = shuffle([built.correctAnswer, ...built.distractors]);
    const correctIndex = options.indexOf(built.correctAnswer);

    return {
      id: crypto.randomUUID(),
      difficulty,
      level,
      type,
      prompt: built.prompt,
      options,
      token: createAnswerToken(correctIndex, built.correctAnswer),
      flagImage: type === "flag" ? answer.flagBase64 : null,
    };
  }

  throw new Error(
    `Could not generate a question for difficulty=${difficulty} after multiple attempts`,
  );
}
