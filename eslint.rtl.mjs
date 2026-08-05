/**
 * The RTL rules, shared by every ESLint config in the repo.
 *
 * Kept in its own file so the root config and each app config enforce exactly
 * the same thing — a rule that only runs in some packages is worse than no
 * rule, because it teaches you to trust a check that isn't there.
 */
export const rtlRules = {
  "no-restricted-syntax": [
    "error",
    {
      selector:
        "Property[key.name=/^(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor|left|right)$/]",
      message:
        "Physical direction does not mirror in Arabic. Use the logical equivalent: marginStart/marginEnd, paddingStart/paddingEnd, start/end.",
    },
    {
      // Matches both `textAlign: "left"` and `textAlign: "left" as const`
      // — the `as const` wraps the literal in a TSAsExpression, so a selector
      // on `value.value` alone silently misses it.
      selector: "Property[key.name='textAlign'] Literal[value=/^(left|right)$/]",
      message: "Use textAlign: 'start' or 'end' so text follows the reading direction.",
    },
  ],
};
