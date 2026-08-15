/**
 * Password strength calculation utility.
 * Criteria: min 8 characters, uppercase, number.
 * Segments filling: Weak (#DC2626) -> Medium (#D97706) -> Strong (#16A34A).
 * Reference: docs/front-end-design-docs/specs/admin-pages/admin-profile.spec.md §5
 */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3;
  label: string;
  color: string;
  percent: number;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: "Chưa nhập",
      color: "#E2E8F0",
      percent: 0,
      hasMinLength: false,
      hasUppercase: false,
      hasNumber: false,
    };
  }

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  let score: 0 | 1 | 2 | 3 = 0;

  if (hasMinLength && hasUppercase && hasNumber) {
    score = 3;
  } else if (hasMinLength && (hasUppercase || hasNumber)) {
    score = 2;
  } else if (hasMinLength || password.length >= 4) {
    score = 1;
  } else {
    score = 0;
  }

  const configs: Record<0 | 1 | 2 | 3, { label: string; color: string; percent: number }> = {
    0: { label: "Rất yếu", color: "#DC2626", percent: 15 },
    1: { label: "Yếu", color: "#DC2626", percent: 33 },
    2: { label: "Trung bình", color: "#D97706", percent: 66 },
    3: { label: "Mạnh", color: "#16A34A", percent: 100 },
  };

  const config = configs[score];

  return {
    score,
    label: config.label,
    color: config.color,
    percent: config.percent,
    hasMinLength,
    hasUppercase,
    hasNumber,
  };
}
