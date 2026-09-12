const SUBS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "i": "ᵢ",
};
const SUPS: Record<string, string> = { "2": "²", "3": "³", "*": "*" };

const CMD: Record<string, string> = {
  "\\beta": "β", "\\alpha": "α", "\\varepsilon": "ε", "\\epsilon": "ε",
  "\\mu": "μ", "\\sigma": "σ", "\\Delta": "Δ", "\\delta": "δ", "\\pi": "π",
  "\\times": "×", "\\cdot": "·", "\\approx": "≈", "\\neq": "≠",
  "\\leq": "≤", "\\geq": "≥", "\\le": "≤", "\\ge": "≥",
  "\\pm": "±", "\\rightarrow": "→", "\\to": "→", "\\Rightarrow": "⇒",
  "\\ldots": "…", "\\dots": "…", "\\infty": "∞", "\\%": "%", "\\&": "&",
  "\\,": " ", "\\;": " ", "\\ ": " ", "\\\\": " ",
};

/**
 * The model is told not to emit LaTeX, but sometimes does. Convert the common
 * pieces to plain Unicode so react-markdown (no KaTeX) renders them readably.
 */
export function sanitizeMath(input: string): string {
  let s = input;

  // \text{...} / \mathrm{...} / \mathbf{...} → inner
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$1");

  // \frac{a}{b} → (a)/(b)
  s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  s = s.replace(/\\d?frac(\d)(\d)/g, "$1/$2");

  // greek / operators
  for (const [k, v] of Object.entries(CMD)) {
    s = s.split(k).join(v);
  }

  // subscripts: β_1, X_{sc}, C_0
  s = s.replace(/([A-Za-zα-ω])_\{([^{}]+)\}/g, (_m, base, sub) => base + toSub(sub));
  s = s.replace(/([A-Za-zα-ω])_([0-9i])/g, (_m, base, sub) => base + (SUBS[sub] ?? "_" + sub));

  // superscripts: R^2, β^*
  s = s.replace(/([A-Za-zα-ω)\]])\^\{([^{}]+)\}/g, (_m, base, sup) => base + toSup(sup));
  s = s.replace(/([A-Za-zα-ω)\]])\^([0-9*])/g, (_m, base, sup) => base + (SUPS[sup] ?? "^" + sup));

  // drop $$ … $$ and $ … $ delimiters (keep content)
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  s = s.replace(/\$([^$\n]+)\$/g, "$1");

  // leftover braces around simple tokens, and any stray backslash-commands
  s = s.replace(/\\left|\\right/g, "");
  s = s.replace(/\\[a-zA-Z]+/g, "");
  s = s.replace(/\s{3,}/g, "  ");

  return s;
}

function toSub(str: string): string {
  return [...str].map((c) => SUBS[c] ?? c).join("");
}
function toSup(str: string): string {
  return [...str].map((c) => SUPS[c] ?? c).join("");
}
