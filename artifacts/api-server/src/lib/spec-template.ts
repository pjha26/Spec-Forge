const templates = {
  feature_spec: {
    name: "Feature specification",
    sections: [
      ["Goals and scope", "State the user problem, the intended outcome, and what is out of scope."],
      ["User stories", "List the actors, their main actions, and what each action should achieve."],
      ["Requirements", "Describe the main flow, failure states, and permission rules."],
      ["Acceptance criteria", "Write observable checks for the main flow and one edge case."],
    ],
  },
  system_design: {
    name: "System design",
    sections: [
      ["Requirements", "List functional requirements and measurable constraints such as latency and capacity."],
      ["Components and data flow", "Identify entry points, storage, external dependencies, and trust boundaries."],
      ["Failure and recovery", "Describe timeouts, retries, monitoring, and how data will be recovered."],
      ["Deployment", "Record environments, configuration, health checks, and rollback steps."],
    ],
  },
  api_design: {
    name: "API design",
    sections: [
      ["Consumers and authentication", "Identify callers and the permissions needed for each operation."],
      ["Endpoints", "List each method and path with request fields, responses, and status codes."],
      ["Errors and limits", "Define validation errors, pagination, rate limits, and retry behavior."],
      ["Acceptance criteria", "Add contract tests for success, invalid input, and missing permissions."],
    ],
  },
  database_schema: {
    name: "Database schema",
    sections: [
      ["Entities and relationships", "List the entities, cardinality, and ownership rules."],
      ["Fields and constraints", "Define types, required values, unique keys, and deletion behavior."],
      ["Queries and indexes", "List the main read and write patterns and the indexes they need."],
      ["Migration and verification", "Describe how existing records will be backfilled and validated."],
    ],
  },
} as const;

export function buildSpecDraft(specType: keyof typeof templates, input: string) {
  const template = templates[specType];
  const source = input.trim().split(/\r?\n/).map(line => "> " + line).join("\n");
  return [
    "# " + template.name,
    "Template draft. Confirm the open decisions before implementation.",
    "## Project context\n\n" + source,
    ...template.sections.map(([heading, instruction]) => "## " + heading + "\n\n- [ ] " + instruction),
  ].join("\n\n");
}

const diagrams = {
  feature_spec: "flowchart LR; A[User need] --> B[Proposed feature]; B --> C[Acceptance checks]",
  system_design: "flowchart LR; A[Client] --> B[Service]; B --> C[Data store]; B --> D[Monitoring]",
  api_design: "flowchart LR; A[API caller] --> B[Validate request]; B --> C[Handle operation]; C --> D[Return response]",
  database_schema: "flowchart LR; A[Entities] --> B[Relationships]; B --> C[Constraints]; C --> D[Indexes]",
} as const;

export function draftDiagram(specType: keyof typeof diagrams) {
  return diagrams[specType];
}
