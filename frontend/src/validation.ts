// Centralized validation utilities — mirrors backend rules in middleware.py

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOB_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const SPECIAL_RE = /[!@#$%^&*(),.?":{}|<>]/;
// E.164-like: optional +, 7–15 digits (spaces/dashes allowed)
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

export type ValidationResult = { valid: true } | { valid: false; message: string };

export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) return { valid: false, message: 'Email is required' };
  if (!EMAIL_RE.test(email.trim())) return { valid: false, message: 'Please enter a valid email address' };
  return { valid: true };
}

// Must match backend validate_password_strength in middleware.py
export function validatePassword(password: string): ValidationResult {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one number' };
  if (!SPECIAL_RE.test(password)) return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*...)' };
  return { valid: true };
}

// Optional field — only validate if a value is provided
export function validateDateOfBirth(dob: string): ValidationResult {
  if (!dob.trim()) return { valid: true };
  if (!DOB_RE.test(dob.trim())) return { valid: false, message: 'Date of birth must be in MM/DD/YYYY format' };
  const [month, day, year] = dob.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { valid: false, message: 'Please enter a valid date' };
  }
  if (date > new Date()) return { valid: false, message: 'Date of birth cannot be in the future' };
  return { valid: true };
}

// Optional field — only validate if a value is provided
export function validatePhone(phone: string): ValidationResult {
  if (!phone.trim()) return { valid: true };
  if (!PHONE_RE.test(phone.trim())) return { valid: false, message: 'Please enter a valid phone number' };
  return { valid: true };
}

export function validateName(value: string, fieldName = 'This field'): ValidationResult {
  if (!value.trim()) return { valid: false, message: `${fieldName} is required` };
  if (value.trim().length < 2) return { valid: false, message: `${fieldName} must be at least 2 characters` };
  return { valid: true };
}

// Returns the first error message found, or null if all pass
export function runValidations(...results: ValidationResult[]): string | null {
  for (const r of results) {
    if (!r.valid) return r.message;
  }
  return null;
}

// True if password satisfies all complexity rules (for canSubmit checks)
export function isPasswordValid(password: string): boolean {
  return validatePassword(password).valid;
}

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string };

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (SPECIAL_RE.test(password)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['transparent', '#EF4444', '#F97316', '#EAB308', '#22C55E'];
  return { score: score as PasswordStrength['score'], label: labels[score], color: colors[score] };
}
