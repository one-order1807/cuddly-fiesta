// Shared by the server action (authoritative) and the strength meter (guidance). No server-only imports.

export function passwordScore(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let s = 0;
  if (pw.length >= 12) s++;
  if (pw.length >= 16) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  if (/(.)\1{3,}|password|123456|qwerty|admin/i.test(pw)) s = Math.max(0, s - 2);
  const score = Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
  return { score, label: ["Too weak", "Weak", "Okay", "Strong", "Excellent"][score] };
}

export function passwordProblem(pw: string, email?: string): string | null {
  if (pw.length < 12) return "Use at least 12 characters.";
  if (email && pw.toLowerCase().includes(email.split("@")[0].toLowerCase())) return "Don't include your email name in the password.";
  if (passwordScore(pw).score < 2) return "That password is too easy to guess. Add length, mixed case, numbers or symbols.";
  return null;
}
