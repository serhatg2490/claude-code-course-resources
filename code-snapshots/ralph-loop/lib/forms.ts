/** Moves focus to the first invalid input (in DOM order), so keyboard and screen reader users land on it. */
export function focusFirstInvalidField(form: HTMLFormElement, invalidNames: string[]) {
  for (const element of form.elements) {
    if (element instanceof HTMLInputElement && invalidNames.includes(element.name)) {
      element.focus();
      return;
    }
  }
}
