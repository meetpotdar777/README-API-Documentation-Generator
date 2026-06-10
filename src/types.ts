export interface TestScenario {
  id: string;
  name: string;
  expectedStatus: number;
  mockResponse: string;
  reqBodyToTrigger?: string;
  isAuthValid: boolean;
  simulateRateLimit: boolean;
}

export interface Endpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  authRequired: boolean;
  scopes: string[];
  headers: { key: string; value: string; description: string }[];
  requestBody?: string; // JSON description or example
  responseBody: string; // JSON description or example
  errorResponse?: string; // JSON description or example
  scenarios?: TestScenario[];
}

export interface ProjectMetadata {
  projectName: string;
  purpose: string;
  features: string[];
  techStack: {
    backend: string[];
    frontend: string[];
    other: string[];
  };
  folderStructure: string;
  howToRun: string[];
  author: {
    name: string;
    role: string;
    linkedin: string;
    portfolio: string;
  };
  securityDetails: string;
  rateLimits: string;
  endpoints: Endpoint[];
  logoUrl?: string;
  oauthScopes?: { name: string; description: string }[];
  license?: "MIT" | "Apache-2.0" | "GPL-3.0" | "BSD-3-Clause" | "Unlicense";
}

export interface VersionHistory {
  version: string;
  date: string;
  changelog: string;
  projectMetadata: ProjectMetadata;
  generatedMarkdown: string;
}
