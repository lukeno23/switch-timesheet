// =============================================================
// Sample events with expected classification results
// Constructed from instructions.md / process_export.py rules,
// NOT from CSV data (D-25: CSV has known classification issues).
//
// These serve as ground truth for testing the rule engine,
// LLM classifier, and full pipeline integration.
// =============================================================

export const sampleEvents: Array<{
  input: {
    title: string;
    switcherName: string;
    switcherDept: string;
    isManagement: boolean;
  };
  expected: {
    category: string;
    department: string;
    classification_method: string;
    confidence: string;
  };
}> = [
  // --- 1. Accounts (Priority 1, always Management dept) ---
  {
    input: {
      title: "EOM payment processing",
      switcherName: "Melissa",
      switcherDept: "Management",
      isManagement: true,
    },
    expected: {
      category: "Accounts",
      department: "Management",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 2. Operations (Priority 1, always Management dept) ---
  {
    input: {
      title: "Vistage preparation",
      switcherName: "Richard",
      switcherDept: "Management",
      isManagement: true,
    },
    expected: {
      category: "Operations",
      department: "Management",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 3. Business Development (Priority 1, named meeting) ---
  {
    input: {
      title: "Daniela follow-up pitch",
      switcherName: "Richard",
      switcherDept: "Management",
      isManagement: true,
    },
    expected: {
      category: "Business Development",
      department: "Management",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 4. HR (Priority 1) ---
  {
    input: {
      title: "Interview - Junior Designer",
      switcherName: "Lisa",
      switcherDept: "PM",
      isManagement: true,
    },
    expected: {
      category: "HR",
      department: "Management",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 5. Brand Writing (Priority 2, always Brand dept) ---
  {
    input: {
      title: "Levaris | Brand fundamentals workshop",
      switcherName: "Ed",
      switcherDept: "Brand",
      isManagement: true,
    },
    expected: {
      category: "Brand Writing",
      department: "Brand",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 6. Non-Client Meeting (Priority 3, internal) ---
  {
    input: {
      title: "Agency planning",
      switcherName: "Luke",
      switcherDept: "Management",
      isManagement: true,
    },
    expected: {
      category: "Non-Client Meeting",
      department: "Management",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 7. External Client Meeting (weekly meeting with client) ---
  {
    input: {
      title: "Fyorin | Weekly catch up",
      switcherName: "Ernesta",
      switcherDept: "Marketing",
      isManagement: false,
    },
    expected: {
      category: "External Client Meeting",
      department: "Marketing",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 8. Emails (Priority 4, cross-dept -> primary) ---
  {
    input: {
      title: "Emails and briefs",
      switcherName: "Kim",
      switcherDept: "PM",
      isManagement: false,
    },
    expected: {
      category: "Emails",
      department: "PM",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 9. Production (Priority 13, Design category) ---
  {
    input: {
      title: "APS | Artwork resizing",
      switcherName: "Nella",
      switcherDept: "Design",
      isManagement: false,
    },
    expected: {
      category: "Production",
      department: "Design",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 10. Ed special: Copywriting -> Marketing ---
  {
    input: {
      title: "Levaris | Blog copywriting",
      switcherName: "Ed",
      switcherDept: "Brand",
      isManagement: true,
    },
    expected: {
      category: "Copywriting",
      department: "Marketing",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 11. Ed special: Design category -> Design ---
  {
    input: {
      title: "Fyorin | Brochure design",
      switcherName: "Ed",
      switcherDept: "Brand",
      isManagement: true,
    },
    expected: {
      category: "Production",
      department: "Design",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 12. Ed special: Strategy -> Brand ---
  {
    input: {
      title: "APS | Strategy session",
      switcherName: "Ed",
      switcherDept: "Brand",
      isManagement: true,
    },
    expected: {
      category: "Strategy",
      department: "Brand",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 13. Lisa special: PM category -> PM ---
  {
    input: {
      title: "Asana task management",
      switcherName: "Lisa",
      switcherDept: "PM",
      isManagement: true,
    },
    expected: {
      category: "Task management",
      department: "PM",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 14. Lisa special: non-PM category -> Management ---
  {
    input: {
      title: "Fyorin | Reporting analysis",
      switcherName: "Lisa",
      switcherDept: "PM",
      isManagement: true,
    },
    expected: {
      category: "Reporting",
      department: "Management",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 15. Designer: most things -> Design ---
  {
    input: {
      title: "Emails and inbox management",
      switcherName: "Andrea",
      switcherDept: "Design",
      isManagement: true,
    },
    expected: {
      category: "Emails",
      department: "Design",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 16. Alias resolution: PP -> Palazzo Parisio ---
  {
    input: {
      title: "PP | Meeting with Austin",
      switcherName: "Ernesta",
      switcherDept: "Marketing",
      isManagement: false,
    },
    expected: {
      category: "External Client Meeting",
      department: "Marketing",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 17. Non-client name: Marketing is not a client ---
  {
    input: {
      title: "Marketing | Team sync",
      switcherName: "Ernesta",
      switcherDept: "Marketing",
      isManagement: false,
    },
    expected: {
      category: "Non-Client Meeting",
      department: "Marketing",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 18. CC Management ---
  {
    input: {
      title: "Fyorin | Content calendar 3-month plan",
      switcherName: "Fan",
      switcherDept: "Marketing",
      isManagement: false,
    },
    expected: {
      category: "CC Management",
      department: "Marketing",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 19. Misc (unresolvable -> LLM fallback) ---
  {
    input: {
      title: "Random unclassifiable task XYZ",
      switcherName: "Steve",
      switcherDept: "Marketing",
      isManagement: false,
    },
    expected: {
      category: "Misc",
      department: "Marketing",
      classification_method: "misc",
      confidence: "borderline",
    },
  },

  // --- 20. Management member: management meeting -> Management ---
  {
    input: {
      title: "Management meeting Q1 review",
      switcherName: "Luke",
      switcherDept: "Management",
      isManagement: true,
    },
    expected: {
      category: "Non-Client Meeting",
      department: "Management",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 21. Paid Management (Marketing category) ---
  {
    input: {
      title: "APS | LinkedIn campaign setup",
      switcherName: "Fan",
      switcherDept: "Marketing",
      isManagement: false,
    },
    expected: {
      category: "Paid Management",
      department: "Marketing",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 22. QA (cross-department) ---
  {
    input: {
      title: "Levaris | Internal QA on designs",
      switcherName: "Kim",
      switcherDept: "PM",
      isManagement: false,
    },
    expected: {
      category: "QA",
      department: "PM",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 23. Configuring LLM ---
  {
    input: {
      title: "Claude project setup for Switch",
      switcherName: "Luke",
      switcherDept: "Management",
      isManagement: true,
    },
    expected: {
      category: "Configuring LLM",
      department: "Management",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 24. Brief writing ---
  {
    input: {
      title: "Palazzo Parisio | Design brief",
      switcherName: "Kim",
      switcherDept: "PM",
      isManagement: false,
    },
    expected: {
      category: "Brief writing",
      department: "PM",
      classification_method: "rule",
      confidence: "confident",
    },
  },

  // --- 25. Web Management ---
  {
    input: {
      title: "Levaris | WordPress CMS update",
      switcherName: "Laura C",
      switcherDept: "Marketing",
      isManagement: false,
    },
    expected: {
      category: "Web Management",
      department: "Marketing",
      classification_method: "rule",
      confidence: "confident",
    },
  },
];
