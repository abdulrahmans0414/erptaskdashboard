/**
 * PasswordStrengthMeter.jsx
 * Visual password strength indicator component
 * Shows strength level, requirements, and feedback
 */

import { useState, useEffect } from "react";

/**
 * Calculate password strength score
 * @param {string} password - Password to check
 * @returns {Object} - { score: 0-100, level: 'weak'|'fair'|'good'|'strong', feedback: [] }
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  const feedback = [];

  if (!password) {
    return { score: 0, level: "weak", feedback };
  }

  // Length requirements
  if (password.length >= 12) {
    score += 20;
  } else if (password.length >= 8) {
    score += 10;
    feedback.push("Password should be at least 12 characters");
  } else {
    feedback.push("Password must be at least 8 characters");
  }

  // Lowercase letters
  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    feedback.push("Add lowercase letters");
  }

  // Uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    feedback.push("Add uppercase letters");
  }

  // Numbers
  if (/\d/.test(password)) {
    score += 20;
  } else {
    feedback.push("Add numbers");
  }

  // Special characters
  if (/[@$!%*?&^#()_+=\-\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 30;
  } else {
    feedback.push("Add special characters (@$!%*?&)");
  }

  // Penalize common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 10; // Repeated characters
  }

  if (
    /123|234|345|456|567|678|789|890|abc|bcd|cde/.test(password.toLowerCase())
  ) {
    score -= 10; // Sequential characters
  }

  score = Math.max(0, Math.min(100, score)); // Clamp between 0-100

  let level = "weak";
  if (score >= 80) level = "strong";
  else if (score >= 60) level = "good";
  else if (score >= 40) level = "fair";

  return { score, level, feedback };
};

/**
 * PasswordStrengthMeter Component
 */
export default function PasswordStrengthMeter({
  password = "",
  onChange = () => {},
}) {
  const [strength, setStrength] = useState({
    score: 0,
    level: "weak",
    feedback: [],
  });

  useEffect(() => {
    const newStrength = calculatePasswordStrength(password);
    setStrength(newStrength);
  }, [password]);

  const getColors = () => {
    switch (strength.level) {
      case "strong":
        return {
          bar: "bg-emerald-500",
          text: "text-emerald-700",
          bg: "bg-emerald-50",
        };
      case "good":
        return { bar: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" };
      case "fair":
        return {
          bar: "bg-amber-500",
          text: "text-amber-700",
          bg: "bg-amber-50",
        };
      case "weak":
        return { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50" };
      default:
        return { bar: "bg-gray-300", text: "text-gray-700", bg: "bg-gray-50" };
    }
  };

  const colors = getColors();

  const requirements = [
    { label: "At least 12 characters", met: password.length >= 12 },
    { label: "Uppercase letters", met: /[A-Z]/.test(password) },
    { label: "Lowercase letters", met: /[a-z]/.test(password) },
    { label: "Numbers", met: /\d/.test(password) },
    {
      label: "Special characters (@$!%*?&)",
      met: /[@$!%*?&^#()_+=\-\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-gray-600">
            Password Strength
          </label>
          <span className={`text-xs font-bold uppercase ${colors.text}`}>
            {strength.level}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${colors.bar} transition-all duration-300`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className={`p-3 rounded-lg ${colors.bg} space-y-2`}>
        <div className="text-xs font-semibold text-gray-700">
          Password Requirements:
        </div>
        <div className="space-y-1.5">
          {requirements.map((req, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={req.met}
                readOnly
                className="w-4 h-4 rounded cursor-default"
              />
              <span
                className={
                  req.met
                    ? "text-gray-700 line-through opacity-50"
                    : "text-gray-700"
                }
              >
                {req.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Messages */}
      {strength.feedback.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <div className="text-xs font-semibold text-amber-900 mb-1">
            Suggestions:
          </div>
          <ul className="text-xs text-amber-800 space-y-0.5">
            {strength.feedback.map((msg, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Score Display */}
      <div className="text-xs text-gray-500 text-center">
        Strength Score: {strength.score}/100
      </div>
    </div>
  );
}

export { calculatePasswordStrength };
