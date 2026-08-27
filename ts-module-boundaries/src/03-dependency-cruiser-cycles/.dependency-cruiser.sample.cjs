/**
 * Sample dependency-cruiser configuration showcasing cycle detection and legacy cycle freezing.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies compile in TypeScript but fail or corrupt values at runtime.",
      from: {},
      to: {
        circular: true,
        // Baselining legacy debt:
        pathNot: "^src/03-dependency-cruiser-cycles/circular-legacy",
      },
    },
  ],
};
