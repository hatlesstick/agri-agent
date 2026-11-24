const RAW_PALETTE = /(bg|text|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/;
const HEX = /#[0-9a-fA-F]{3,8}\b/;

const rule = {
  meta: {
    type: "problem",
    messages: {
      raw: "Use a semantic colour token (bg-surface, text-ink, border-rule, text-go …) instead of {{match}}.",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "className" || !node.value) return;
        const text = context.sourceCode.getText(node.value);
        const match = text.match(RAW_PALETTE) ?? text.match(HEX);
        if (match) context.report({ node, messageId: "raw", data: { match: match[0] } });
      },
    };
  },
};

export default rule;
