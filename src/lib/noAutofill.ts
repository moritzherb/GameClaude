/**
 * iPhones offer "AutoFill Contact" on fields whose label or placeholder mentions a name. A zero-width
 * non-joiner inside the word looks the same but stops that match.
 */
export const unfill = (text: string) => text.replace(/(na)(me)/gi, '$1‌$2');
