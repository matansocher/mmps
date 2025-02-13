interface MessageTemplateParams {
  readonly totalExercises?: number;
  readonly currentStreak?: number;
  readonly longestStreak?: number;
}

export function processMessageTemplate(template: string, params: MessageTemplateParams): string {
  return template.replace(/\{([^}]+)}/g, (_, expression) => {
    try {
      const evalFunction = new Function(...Object.keys(params), `return ${expression};`);
      return evalFunction(...Object.values(params)).toString();
    } catch (error) {
      return `{${expression}}`; // Keep it unchanged if there's an error
    }
  });
}
