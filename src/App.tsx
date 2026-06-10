import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle,
  Code,
  Compass,
  Copy,
  ExternalLink,
  FileText,
  GitBranch,
  HelpCircle,
  Key,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Terminal,
  Trash2,
  Workflow,
  Search,
  Sparkles,
  Download,
  Upload,
  PlayCircle,
  CheckSquare,
  Save
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line
} from "recharts";
import { Endpoint, ProjectMetadata, VersionHistory, TestScenario } from "./types";
import { SAMPLE_PROJECTS } from "./data";
import MarkdownView from "./components/MarkdownView";
import { BrandLogo } from "./components/BrandLogo";

export default function App() {
  // Navigation: "editor" or "portal"
  const [activeView, setActiveView] = useState<"editor" | "portal">("editor");

  // Portal submenu selection
  const [portalTab, setPortalTab] = useState<
    "readme" | "api-explorer" | "oauth2" | "rate-limiting" | "security" | "versions"
  >("readme");

  // Custom configuration data
  const [projectData, setProjectData] = useState<ProjectMetadata>(SAMPLE_PROJECTS.paymentSaaS);

  // Output generated values
  const [generatedMarkdown, setGeneratedMarkdown] = useState<string>("");
  const [developerInsights, setDeveloperInsights] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Versions history list
  const [versions, setVersions] = useState<VersionHistory[]>([
    {
      version: "1.0.0",
      date: "2026-06-10",
      changelog: "Initial release of the payment system and oauth schema.",
      projectMetadata: SAMPLE_PROJECTS.paymentSaaS,
      generatedMarkdown: "" // Will copy current sample markdown if generated
    }
  ]);
  const [newVersionTag, setNewVersionTag] = useState("1.1.0");
  const [newVersionChangelog, setNewVersionChangelog] = useState("");

  // Sandbox client variables (for live simulation testing)
  const [activeEndpointId, setActiveEndpointId] = useState<string>("");
  const [mockToken, setMockToken] = useState<string>("");
  const [sandboxRequestBody, setSandboxRequestBody] = useState<string>("");
  const [sandboxResponse, setSandboxResponse] = useState<any>(null);
  const [sandboxHeaders, setSandboxHeaders] = useState<Record<string, string>>({});
  const [sandboxStatus, setSandboxStatus] = useState<number | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  // Rate limiter simulator counters
  const [clientRequestCount, setClientRequestCount] = useState<number>(0);
  const [rateLimitMax] = useState<number>(10);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number>(10);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState<number>(0);

  // Selected Code snippet language tab
  const [codeLang, setCodeLang] = useState<"curl" | "typescript" | "python" | "php" | "java">("curl");

  // OAuth2 Scopes local form
  const [newScopeName, setNewScopeName] = useState("");
  const [newScopeDescription, setNewScopeDescription] = useState("");

  // Export & Import configuration logic
  const exportProjectConfig = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${projectData.projectName.toLowerCase().replace(/\s+/g, "_")}_config.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Config export error:", err);
    }
  };

  const importProjectConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && typeof parsed === "object" && parsed.projectName) {
          setProjectData(parsed);
          if (parsed.endpoints && parsed.endpoints.length > 0) {
            setActiveEndpointId(parsed.endpoints[0].id);
          } else {
            setActiveEndpointId("");
          }
          setGenerationError(null);
          setSandboxResponse(null);
          setSandboxStatus(null);
          setHasGeneratedCode(false);
          const staticMarkdown = generateLocalStaticMarkdown(parsed);
          setGeneratedMarkdown(staticMarkdown);
        } else {
          alert("Invalid project configuration file. Must be a valid JSON with at least a 'projectName' field.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    fileReader.readAsText(files[0]);
    event.target.value = "";
  };

  // New item inputs
  const [newFeature, setNewFeature] = useState("");
  const [newHowToRun, setNewHowToRun] = useState("");
  const [newBackendTech, setNewBackendTech] = useState("");
  const [newFrontendTech, setNewFrontendTech] = useState("");
  const [newOtherTech, setNewOtherTech] = useState("");

  // Manage API endpoints creation
  const [newEndpoint, setNewEndpoint] = useState<Omit<Endpoint, 'id'>>({
    method: "POST",
    path: "/api/v1/new-route",
    description: "Describe what this endpoint does",
    authRequired: true,
    scopes: ["read:data"],
    headers: [{ key: "Content-Type", value: "application/json", description: "Payload format" }],
    requestBody: "{\n  \"example\": \"value\"\n}",
    responseBody: "{\n  \"success\": true\n}",
    errorResponse: "{\n  \"error\": \"validation_failed\"\n}"
  });

  // Track if current project state has been successfully processed to README
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false);
  const [readmeCopied, setReadmeCopied] = useState(false);

  // Custom AI logo generation states
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoWarning, setLogoWarning] = useState<string | null>(null);
  const [logoGenerationType, setLogoGenerationType] = useState<"imagen" | "svg" | null>(null);

  // Search query index for developer portal
  const [portalSearchQuery, setPortalSearchQuery] = useState("");

  // Create Endpoint Scenario local form states
  const [newScenarioName, setNewScenarioName] = useState("");
  const [newScenarioExpectedStatus, setNewScenarioExpectedStatus] = useState<number>(200);
  const [newScenarioMockResponse, setNewScenarioMockResponse] = useState("{\n  \"success\": true\n}");
  const [newScenarioIsAuthValid, setNewScenarioIsAuthValid] = useState(true);
  const [newScenarioSimulateRateLimit, setNewScenarioSimulateRateLimit] = useState(false);

  // Automated test suite states
  const [testSuiteResults, setTestSuiteResults] = useState<{
    id: string;
    name: string;
    expectedStatus: number;
    actualStatus: number;
    result: "PASS" | "FAIL";
    mockResponse: string;
  }[]>([]);
  const [isTestingSuiteRunning, setIsTestingSuiteRunning] = useState(false);

  // Dynamic API latency & load telemetry over time for Recharts visualization
  const [latencyMetrics, setLatencyMetrics] = useState<{ time: string; latency: number; load: number; limit: number }[]>([
    { time: "12:00", latency: 120, load: 2, limit: 10 },
    { time: "12:05", latency: 135, load: 3, limit: 10 },
    { time: "12:10", latency: 110, load: 2, limit: 10 },
    { time: "12:15", latency: 260, load: 6, limit: 10 },
    { time: "12:20", latency: 95, load: 1, limit: 10 },
    { time: "12:25", latency: 450, load: 8, limit: 10 },
    { time: "12:30", latency: 1350, load: 12, limit: 10 }, // 429 spike
    { time: "12:35", latency: 85, load: 0, limit: 10 },
    { time: "12:40", latency: 115, load: 2, limit: 10 },
    { time: "12:45", latency: 140, load: 4, limit: 10 },
  ]);

  // Handle generating a custom AI Logo or Favicon banner
  const handleGenerateLogo = async () => {
    setLogoLoading(true);
    setLogoError(null);
    setLogoWarning(null);
    try {
      const response = await fetch("/api/generate-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectData.projectName,
          purpose: projectData.purpose
        })
      });

      if (!response.ok) {
        let errMsg = "Logo generation gateway error status " + response.status;
        try {
          const errBody = await response.json();
          if (errBody && errBody.error) {
            errMsg = errBody.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const result = await response.json();
      if (result.imageUrl) {
        setProjectData(prev => ({ ...prev, logoUrl: result.imageUrl }));
        setLogoGenerationType(result.type || "svg");
        if (result.localFallback) {
          setLogoWarning("API Key restricted (reported leaks). Hand-crafted premium local vector logo designed successfully!");
        } else {
          setLogoWarning(null);
        }
        // Force reset generation status to incorporate new banner on rebuild
        setHasGeneratedCode(false);
      } else {
        throw new Error("No image data returned from endpoint.");
      }
    } catch (err: any) {
      console.error(err);
      setLogoError(err.message || "Failed to contact design endpoint. Please check connection.");
    } finally {
      setLogoLoading(false);
    }
  };

  // Automated Test Suite Runner (Executes all test scenarios for selected endpoint)
  const runAutomatedTestSuite = async () => {
    const ep = projectData.endpoints.find(e => e.id === activeEndpointId);
    if (!ep) return;

    setIsTestingSuiteRunning(true);
    setTestSuiteResults([]);
    
    const scenariosToRun = ep.scenarios || [
      {
        id: "scen-auto-success-fallback",
        name: "Standard Direct Response Check (Expected 200)",
        expectedStatus: 200,
        mockResponse: ep.responseBody,
        isAuthValid: true,
        simulateRateLimit: false
      }
    ];

    const resultsList: typeof testSuiteResults = [];

    // Run each predefined test scenario with realistic timeout animations
    for (const scen of scenariosToRun) {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      let actualStatus = 200;
      let mockRes = scen.mockResponse;

      if (scen.simulateRateLimit) {
        actualStatus = 429;
      } else if (ep.authRequired && !scen.isAuthValid) {
        actualStatus = 401;
      } else {
        actualStatus = scen.expectedStatus;
      }

      const passed = actualStatus === scen.expectedStatus;

      resultsList.push({
        id: scen.id,
        name: scen.name,
        expectedStatus: scen.expectedStatus,
        actualStatus: actualStatus,
        result: passed ? "PASS" : "FAIL",
        mockResponse: mockRes
      });

      // Insert fresh latency monitoring point
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const lat = actualStatus === 429 ? 1200 + Math.floor(Math.random() * 200) : 
                  actualStatus === 401 ? 45 + Math.floor(Math.random() * 30) : 
                  150 + Math.floor(Math.random() * 150);

      setLatencyMetrics(prev => [
        ...prev.slice(-14),
        { time: now, latency: lat, load: Math.floor(Math.random() * 4) + 1, limit: 10 }
      ]);
    }

    setTestSuiteResults(resultsList);
    setIsTestingSuiteRunning(false);
  };

  // Simulate a rapid burst of concurrent traffic load and generate diagnostic metrics
  const triggerTrafficSpikeSimulation = () => {
    let delay = 0;
    const initialBurstPointsCount = 6;
    
    for (let i = 0; i < initialBurstPointsCount; i++) {
      setTimeout(() => {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const loads = [6, 8, 11, 14, 8, 3];
        const lats = [310, 520, 1420, 1550, 680, 180];
        
        setClientRequestCount(prev => prev + 1);
        setLatencyMetrics(prev => [
          ...prev.slice(-14),
          { time: now, latency: lats[i], load: loads[i], limit: 10 }
        ]);
      }, delay);
      delay += 400;
    }
  };

  // Load a preset template
  const loadPreset = (key: keyof typeof SAMPLE_PROJECTS) => {
    setProjectData(SAMPLE_PROJECTS[key]);
    setGenerationError(null);
    setSandboxResponse(null);
    setSandboxStatus(null);
    setHasGeneratedCode(false);
  };

  // Automated rate-limiting reset timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (clientRequestCount > 0) {
      setRateLimitRemaining(Math.max(0, rateLimitMax - clientRequestCount));
      if (clientRequestCount >= rateLimitMax) {
        setIsRateLimited(true);
        setRateLimitResetTime(10); // 10 seconds lockout simulation
      }
    }
    return () => clearTimeout(timer);
  }, [clientRequestCount, rateLimitMax]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (rateLimitResetTime > 0) {
      interval = setInterval(() => {
        setRateLimitResetTime((prev) => {
          if (prev <= 1) {
            setIsRateLimited(false);
            setClientRequestCount(0);
            setRateLimitRemaining(rateLimitMax);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [rateLimitResetTime, rateLimitMax]);

  // Set active endpoint sandbox when endpoints change or views shift
  useEffect(() => {
    if (projectData.endpoints.length > 0 && !activeEndpointId) {
      setActiveEndpointId(projectData.endpoints[0].id);
      setSandboxRequestBody(projectData.endpoints[0].requestBody || "");
    }
  }, [projectData, activeEndpointId]);

  const selectEndpoint = (id: string) => {
    setActiveEndpointId(id);
    const ep = projectData.endpoints.find(e => e.id === id);
    if (ep) {
      setSandboxRequestBody(ep.requestBody || "");
      setSandboxResponse(null);
      setSandboxStatus(null);
    }
  };

  // Generate complete Markdown with server-side Gemini API
  const handleGenerateMD = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Server returned empty output");
      }

      const result = await response.json();
      setGeneratedMarkdown(result.readmeMarkdown || "");
      setDeveloperInsights(result.developerInsights || "Success! No specific warnings.");
      setHasGeneratedCode(true);

      // Automatically populate version markdown
      setVersions(prev => prev.map((v, i) => i === 0 ? { ...v, generatedMarkdown: result.readmeMarkdown } : v));
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Failed to make connections with the model. Please check configuration requirements.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Run initial generation on mount if empty
  useEffect(() => {
    if (!generatedMarkdown && !isGenerating) {
      // Create a fallback static default version immediately so the user doesn't see a blank page
      const staticMarkdown = generateLocalStaticMarkdown(projectData);
      setGeneratedMarkdown(staticMarkdown);
    }
  }, []);

  // Simple offline fallback markdown logic
  function generateLocalStaticMarkdown(proj: ProjectMetadata) {
    const badgesTech = [...proj.techStack.backend, ...proj.techStack.frontend, ...proj.techStack.other]
      .map(t => `![${t}](https://img.shields.io/badge/${t.replace(/\s+/g, "_")}-3b82f6?style=for-the-badge)`).join("\n") + "\n" +
      `![License](https://img.shields.io/badge/License-${(proj.license || 'MIT').replace(/-/g, '_')}-blue?style=for-the-badge)`;

    const scopesMd = proj.oauthScopes && proj.oauthScopes.length > 0
      ? `\n### 🔑 Available OAuth2 permission scopes\n\n| Scope | Description |\n| :--- | :--- |\n` + proj.oauthScopes.map(s => `| \`${s.name}\` | ${s.description} |`).join("\n")
      : "";

    const endpointsMd = proj.endpoints && proj.endpoints.length > 0
      ? `\n\n## 📡 API Endpoints Specifications\n\n` + proj.endpoints.map(ep => `
### \`${ep.method}\` ${ep.path}
* **Description**: ${ep.description}
* **OAuth2 Authentication Required**: ${ep.authRequired ? "Yes" : "No"}
${ep.scopes && ep.scopes.length > 0 ? `* **Scopes Required**: ${ep.scopes.map(s => `\`${s}\``).join(", ")}` : ""}
* **Headers**:
${ep.headers && ep.headers.length > 0 ? ep.headers.map(h => `  * \`${h.key}\`: \`${h.value}\` (${h.description || "No description"})`).join("\n") : "  * None"}
${ep.requestBody && ep.method !== "GET" ? `* **Request Body Sample**:
\`\`\`json
${ep.requestBody}
\`\`\`` : ""}
* **Response Sample (Success)**:
\`\`\`json
${ep.responseBody}
\`\`\`
`).join("\n---\n")
      : "";

    return `# 🌍 ${proj.projectName}

${badgesTech}

${proj.purpose}

## 🚀 Features

${proj.features.map(f => `* ${f}`).join("\n")}

---

## 🛠️ Tech Stack

| Layer | Technology |
| :-----------| :--------------------------------|
| **Backend** | ${proj.techStack.backend.join(", ")} |
| **Frontend**| ${proj.techStack.frontend.join(", ")} |
| **Other** | ${proj.techStack.other.join(", ")} |

---

## 📂 Project Structure

\`\`\`text
${proj.folderStructure}
\`\`\`

---

## ⚙️ How to Run

${proj.howToRun.map((step, idx) => `${idx + 1}. ${step}`).join("\n")}

---

## 🔒 Security & OAuth2 Best Practices

${proj.securityDetails}

All requests require OAuth2 keys. Keep keys secure and rotating dynamically for audit logs.
${scopesMd}

---
${endpointsMd}

---

## ⚡ Rate Limiting Strategy
* Max Limit: ${proj.rateLimits}
* Return Code: \`429 Too Many Requests\`

---

  ## 👨💻 Author
  
  **${proj.author.name}**
  *${proj.author.role}*
  
  ![LinkedIn](https://img.shields.io/badge/LinkedIn-blue?style=for-the-badge&logo=linkedin) ![Portfolio](https://img.shields.io/badge/Portfolio-emerald?style=for-the-badge)
  
  Built with ❤️ using ${proj.techStack.frontend[0] || "React"} & ${proj.techStack.backend[0] || "Express"}
  
  ---
  
  ## 📄 License
  
  This project is licensed under the **${proj.license || 'MIT'} License**. See the \`LICENSE\` file for details.`;
  }

  // Live simulation API Sandbox
  const testSandboxQuery = () => {
    const ep = projectData.endpoints.find(e => e.id === activeEndpointId);
    if (!ep) return;

    setSandboxLoading(true);

    // Simulate Network Latency
    setTimeout(() => {
      setClientRequestCount(prev => prev + 1);

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // 1. Check Rate Limit status
      if (isRateLimited || clientRequestCount >= rateLimitMax) {
        setSandboxStatus(429);
        setSandboxResponse({
          error: "too_many_requests",
          message: "API rate limit value has been exceeded.",
          retry_after_seconds: rateLimitResetTime || 10
        });
        setSandboxHeaders({
          "Content-Type": "application/json",
          "X-RateLimit-Limit": rateLimitMax.toString(),
          "X-RateLimit-Remaining": "0",
          "Retry-After": (rateLimitResetTime || 10).toString()
        });
        
        // Push 429 latency spike to metrics
        const lat = 1100 + Math.floor(Math.random() * 200);
        setLatencyMetrics(prev => [
          ...prev.slice(-14),
          { time: now, latency: lat, load: Math.min(15, clientRequestCount + 1), limit: 10 }
        ]);

        setSandboxLoading(false);
        return;
      }

      // 2. Check Auth Scope status if auth required
      if (ep.authRequired) {
        const isHeaderBearerPresent = mockToken.trim().length > 10;
        if (!isHeaderBearerPresent) {
          setSandboxStatus(401);
          setSandboxResponse({
            error: "unauthorized",
            message: "Missing or invalid OAuth2.0 authentication credentials.",
            required_scheme: "Bearer JWT token in Authorization Header"
          });
          setSandboxHeaders({
            "Content-Type": "application/json",
            "WWW-Authenticate": "Bearer realm=\"api\", error=\"invalid_token\"",
            "X-RateLimit-Limit": rateLimitMax.toString(),
            "X-RateLimit-Remaining": Math.max(0, rateLimitMax - clientRequestCount - 1).toString()
          });

          // Push unauthorized (thin low latency gateway bounce)
          const lat = 40 + Math.floor(Math.random() * 20);
          setLatencyMetrics(prev => [
            ...prev.slice(-14),
            { time: now, latency: lat, load: clientRequestCount + 1, limit: 10 }
          ]);

          setSandboxLoading(false);
          return;
        }
      }

      // 3. Successful Mock Response Output
      setSandboxStatus(200);
      try {
        setSandboxResponse(JSON.parse(ep.responseBody));
      } catch (e) {
        setSandboxResponse({ data: ep.responseBody });
      }

      const customSandboxHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": rateLimitMax.toString(),
        "X-RateLimit-Remaining": Math.max(0, rateLimitMax - clientRequestCount - 1).toString(),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Date": new Date().toUTCString()
      };
      if (ep.headers && ep.headers.length > 0) {
        ep.headers.forEach(h => {
          if (h.key) {
            customSandboxHeaders[h.key] = h.value;
          }
        });
      }
      setSandboxHeaders(customSandboxHeaders);

      // Push success latency
      const lat = 120 + Math.floor(Math.random() * 150);
      setLatencyMetrics(prev => [
        ...prev.slice(-14),
        { time: now, latency: lat, load: clientRequestCount + 1, limit: 10 }
      ]);

      setSandboxLoading(false);
    }, 700);
  };

  // Generate OAuth mock JWT client-side
  const handleGenerateMockToken = () => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      iss: projectData.projectName,
      sub: "usr_developer_99x",
      scopes: ["read:transactions", "write:transactions"],
      exp: Math.floor(Date.now() / 1000) + 3600
    }));
    const signature = "sig_sec_f90138daafbf0a133d";
    setMockToken(`${header}.${payload}.${signature}`);
  };

  // Version Control Snapshot
  const handleCreateVersion = () => {
    if (!newVersionTag.trim()) return;
    const item: VersionHistory = {
      version: newVersionTag,
      date: new Date().toISOString().split('T')[0],
      changelog: newVersionChangelog || "Updated features and API configuration snapshots.",
      projectMetadata: { ...projectData },
      generatedMarkdown: generatedMarkdown
    };
    setVersions(prev => [item, ...prev]);
    setNewVersionTag("");
    setNewVersionChangelog("");
  };

  // Add Item Helpers
  const addFeature = () => {
    if (!newFeature.trim()) return;
    setProjectData(prev => ({ ...prev, features: [...prev.features, newFeature.trim()] }));
    setNewFeature("");
  };

  const removeFeature = (idx: number) => {
    setProjectData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  };

  const addHowToRun = () => {
    if (!newHowToRun.trim()) return;
    setProjectData(prev => ({ ...prev, howToRun: [...prev.howToRun, newHowToRun.trim()] }));
    setNewHowToRun("");
  };

  const removeHowToRun = (idx: number) => {
    setProjectData(prev => ({ ...prev, howToRun: prev.howToRun.filter((_, i) => i !== idx) }));
  };

  const addBackendTech = () => {
    if (!newBackendTech.trim()) return;
    setProjectData(prev => ({
      ...prev,
      techStack: { ...prev.techStack, backend: [...prev.techStack.backend, newBackendTech.trim()] }
    }));
    setNewBackendTech("");
  };

  const removeBackendTech = (tech: string) => {
    setProjectData(prev => ({
      ...prev,
      techStack: { ...prev.techStack, backend: prev.techStack.backend.filter(t => t !== tech) }
    }));
  };

  const addFrontendTech = () => {
    if (!newFrontendTech.trim()) return;
    setProjectData(prev => ({
      ...prev,
      techStack: { ...prev.techStack, frontend: [...prev.techStack.frontend, newFrontendTech.trim()] }
    }));
    setNewFrontendTech("");
  };

  const removeFrontendTech = (tech: string) => {
    setProjectData(prev => ({
      ...prev,
      techStack: { ...prev.techStack, frontend: prev.techStack.frontend.filter(t => t !== tech) }
    }));
  };

  const addOtherTech = () => {
    if (!newOtherTech.trim()) return;
    setProjectData(prev => ({
      ...prev,
      techStack: { ...prev.techStack, other: [...prev.techStack.other, newOtherTech.trim()] }
    }));
    setNewOtherTech("");
  };

  const removeOtherTech = (tech: string) => {
    setProjectData(prev => ({
      ...prev,
      techStack: { ...prev.techStack, other: prev.techStack.other.filter(t => t !== tech) }
    }));
  };

  const handleAddNewEndpoint = () => {
    const id = "route-" + Math.random().toString(36).substr(2, 9);
    setProjectData(prev => ({
      ...prev,
      endpoints: [...prev.endpoints, { ...newEndpoint, id }]
    }));
    setActiveEndpointId(id);
    // Reset additions form to defaults
    setNewEndpoint({
      method: "POST",
      path: "/api/v1/new-route",
      description: "Describe what this endpoint does",
      authRequired: true,
      scopes: ["read:data"],
      headers: [{ key: "Content-Type", value: "application/json", description: "Payload format" }],
      requestBody: "{\n  \"example\": \"value\"\n}",
      responseBody: "{\n  \"success\": true\n}",
      errorResponse: "{\n  \"error\": \"validation_failed\"\n}"
    });
  };

  const removeEndpointIndex = (idx: number) => {
    setProjectData(prev => {
      const updated = prev.endpoints.filter((_, i) => i !== idx);
      if (updated.length > 0) {
        setActiveEndpointId(updated[0].id);
      } else {
        setActiveEndpointId("");
      }
      return { ...prev, endpoints: updated };
    });
  };

  // Code Snippet generators based on active selection
  const generateSnippet = (lang: "curl" | "typescript" | "python" | "php" | "java", ep: Endpoint | undefined) => {
    if (!ep) return "No endpoint configured.";
    const headersStr = ep.headers.map(h => ` -H "${h.key}: ${h.value}"`).join("");
    const authHeader = ep.authRequired ? ` -H "Authorization: Bearer ${mockToken || "<YOUR_ACCESS_TOKEN>"}"` : "";

    if (lang === "curl") {
      let cmd = `curl -X ${ep.method} https://api.${projectData.projectName.toLowerCase().replace(/\s+/g, "")}.com${ep.path}${headersStr}${authHeader}`;
      if (ep.requestBody && ep.method !== "GET") {
        cmd += ` \\\n  -d '${ep.requestBody.replace(/\n\s*/g, "")}'`;
      }
      return cmd;
    }

    if (lang === "typescript") {
      const headerObj: Record<string, string> = {};
      ep.headers.forEach(h => { headerObj[h.key] = h.value; });
      if (ep.authRequired) {
        headerObj["Authorization"] = `Bearer ${mockToken || "YOUR_ACCESS_TOKEN"}`;
      }

      return `// TypeScript fetch request
const requestOptions: RequestInit = {
  method: '${ep.method}',
  headers: ${JSON.stringify(headerObj, null, 2)},
  ${ep.requestBody && ep.method !== "GET" ? `body: JSON.stringify(${ep.requestBody.trim()})` : ""}
};

async function invokeEndpoint() {
  try {
    const response = await fetch('https://api.${projectData.projectName.toLowerCase().replace(/\s+/g, "")}.com${ep.path}', requestOptions);
    
    // Check for standard Rate Limits or Security headers
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.warn('Rate Limited! Backoff required. Retry in ' + retryAfter + 's');
      return;
    }
    
    const data = await response.json();
    console.log('Success Response:', data);
  } catch (error) {
    console.error('API Error details:', error);
  }
}
`;
    }

    if (lang === "python") {
      const headerDictStr = ep.headers.map(h => `    "${h.key}": "${h.value}"`).join(",\n");
      const authHeaderPython = ep.authRequired ? `,\n    "Authorization": "Bearer ${mockToken || "YOUR_ACCESS_TOKEN"}"` : "";

      return `# Python requests library implementation
import requests
import json

url = "https://api.${projectData.projectName.toLowerCase().replace(/\s+/g, "")}.com${ep.path}"
headers = {
${headerDictStr}${authHeaderPython}
}

payload = ${ep.requestBody ? ep.requestBody.trim() : "None"}

try:
    response = requests.${ep.method.toLowerCase()}(
        url, 
        headers=headers, 
        json=payload if payload else None,
        timeout=10
    )
    
    # Handle rate-limit status code (429)
    if response.status_code == 429:
        retry_time = response.headers.get("Retry-After", 10)
        print(f"Rate limited. Backing off for {retry_time} seconds")
    else:
        print("Status Code:", response.status_code)
        print("Body:", response.json())
except requests.exceptions.RequestException as e:
    print("API Error executing request:", e)
`;
    }

    if (lang === "php") {
      const authHeaderPhp = ep.authRequired ? `,\n    "Authorization: Bearer ${mockToken || "<YOUR_ACCESS_TOKEN>"}"` : "";
      const headersArrayStr = ep.headers.map(h => `    "${h.key}: ${h.value}"`).join(",\n");

      return `<?php
// PHP cURL Custom Integration Module
$ch = curl_init();

$url = "https://api.${projectData.projectName.toLowerCase().replace(/\s+/g, "")}.com${ep.path}";
$headers = [
    "Content-Type: application/json"${headersArrayStr ? ",\n" + headersArrayStr : ""}${authHeaderPhp}
];

curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${ep.method}");
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

${ep.requestBody && ep.method !== "GET" ? `$payload = '${ep.requestBody.replace(/'/g, "\\'")};\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(json_decode($payload)));` : ""}

$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo "API Network Error: " . curl_error($ch) . "\\n";
} else {
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    echo "HTTP Gateway Echo: " . $statusCode . "\\n";
    if ($statusCode === 429) {
        echo "Exceeded active sliding burst rate limit timers. Exponential backoff is required.\\n";
    }
    echo "Response Payload: " . $response . "\\n";
}

curl_close($ch);
`;
    }

    if (lang === "java") {
      const authHeaderJava = ep.authRequired ? `\n            .header("Authorization", "Bearer ${mockToken || "YOUR_ACCESS_TOKEN"}")` : "";
      const headersChainStr = ep.headers.map(h => `            .header("${h.key}", "${h.value}")`).join("\n");

      return `// Java Modern HttpClient Native Module (Java 11+)
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class CustomGatewayClient {
    public static void main(String[] args) {
        HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

        String payload = ${ep.requestBody && ep.method !== "GET" ? `"${ep.requestBody.replace(/\n\s*/g, " ").replace(/"/g, "\\\"")}"` : "null"};

        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
            .uri(URI.create("https://api.${projectData.projectName.toLowerCase().replace(/\s+/g, "")}.com${ep.path}"))
            .header("Content-Type", "application/json")
${headersChainStr}${authHeaderJava};

        if (payload != null) {
            requestBuilder.method("${ep.method}", HttpRequest.BodyPublishers.ofString(payload));
        } else {
            requestBuilder.method("${ep.method}", HttpRequest.BodyPublishers.noBody());
        }

        try {
            HttpResponse<String> response = client.send(
                requestBuilder.build(),
                HttpResponse.BodyHandlers.ofString()
            );

            System.out.println("Gateway Echo Status: " + response.statusCode());
            System.out.println("Response Payload: " + response.body());
            
            if (response.statusCode() == 429) {
                System.out.println("Wait! Under Rate Limiting timers backoff.");
            }
        } catch (Exception e) {
            System.err.println("API Request Failure Execution details: " + e.getMessage());
        }
    }
}
`;
    }
  };

  const selectedEndpoint = projectData.endpoints.find(e => e.id === activeEndpointId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans mb-12">
      {/* Upper Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-slate-100 shadow-md border-b border-slate-800 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="w-10 h-10" />
            <div>
              <h1 className="text-sm font-semibold font-display tracking-tight text-white flex items-center gap-1.5">
                README & API Docs Generator
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">STANDARDIZED DEVELOPER PORTAL</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">Active Presets:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-800 border border-slate-700">
              <button
                onClick={() => loadPreset("paymentSaaS")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${projectData.projectName === "HorizonPay" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                HorizonPay (SaaS)
              </button>
              <button
                onClick={() => loadPreset("taskAPI")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${projectData.projectName === "SyncTask Cloud" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                SyncTask (Cloud)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveView("editor")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${activeView === "editor" ? "bg-slate-800 text-white shadow" : "text-slate-300 hover:text-white hover:bg-slate-800"}`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Portal Builder
            </button>
            <button
              onClick={() => setActiveView("portal")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${activeView === "portal" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-300 hover:text-white hover:bg-slate-800"}`}
            >
              <Compass className="w-3.5 h-3.5 text-indigo-200" />
              Interactive Portal
            </button>
          </div>
        </div>
      </header>

      {/* Main Dynamic Workspace Panels */}
      <main className="max-w-7xl mx-auto w-full px-4 mt-6 flex-grow">
        {activeView === "editor" ? (
          /* ==================== CONFIGURATION WRITER/EDITOR PANEL ==================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="max-w-2xl">
                <h2 className="text-xl font-semibold font-display tracking-tight text-slate-800 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-500" /> Specify Project Specs
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust custom parameters here. Pressing "Generate with Gemini" will invoke our server-side API key and standard metadata parsing rules to construct a beautiful standardized markdown.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Export Config */}
                <button
                  type="button"
                  onClick={exportProjectConfig}
                  className="px-4 py-2 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Export entire project configuration as a JSON file"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500 animate-pulse" />
                  Export Config
                </button>

                {/* Import Config */}
                <label 
                  className="px-4 py-2 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Import configuration JSON file back into the portal"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  Import Config
                  <input
                    type="file"
                    accept=".json"
                    onChange={importProjectConfig}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleGenerateMD}
                  disabled={isGenerating}
                  className="px-5 py-2 cursor-pointer bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-semibold hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? "Gemini Technical Writing..." : "Generate with Gemini"}
                </button>
              </div>
            </div>

            {generationError && (
              <div className="lg:col-span-12 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-rose-900">Gemini Key or Generation Error</h4>
                  <p className="mt-0.5">{generationError}</p>
                </div>
              </div>
            )}

            {/* Left Hand Form Controls */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Section 1: Core details */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  General & Author Settings
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Project Name</label>
                    <input
                      type="text"
                      value={projectData.projectName}
                      onChange={(e) => setProjectData(v => ({ ...v, projectName: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                      placeholder="e.g. HorizonPay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Author Name</label>
                    <input
                      type="text"
                      value={projectData.author.name}
                      onChange={(e) => setProjectData(v => ({ ...v, author: { ...v.author, name: e.target.value } }))}
                      className="mt-1 block w-full rounded-lg border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                      placeholder="e.g. Jean"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Author Role</label>
                    <input
                      type="text"
                      value={projectData.author.role}
                      onChange={(e) => setProjectData(v => ({ ...v, author: { ...v.author, role: e.target.value } }))}
                      className="mt-1 block w-full rounded-lg border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                      placeholder="e.g. Lead Engineer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">LinkedIn Badge</label>
                      <input
                        type="text"
                        value={projectData.author.linkedin}
                        onChange={(e) => setProjectData(v => ({ ...v, author: { ...v.author, linkedin: e.target.value } }))}
                        className="mt-1 block w-full rounded-lg border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                        placeholder="LinkedIn alias"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Portfolio Badge</label>
                      <input
                        type="text"
                        value={projectData.author.portfolio}
                        onChange={(e) => setProjectData(v => ({ ...v, author: { ...v.author, portfolio: e.target.value } }))}
                        className="mt-1 block w-full rounded-lg border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                        placeholder="Portfolio link"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Select Project License</label>
                    <select
                      value={projectData.license || "MIT"}
                      onChange={(e) => {
                        const nextLic = e.target.value as any;
                        setProjectData(v => {
                          const updated = { ...v, license: nextLic };
                          // Auto trigger a quick re-compile of fallback markdown to show changes immediately
                          const staticMarkdown = generateLocalStaticMarkdown(updated);
                          setGeneratedMarkdown(staticMarkdown);
                          return updated;
                        });
                      }}
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none focus:border-indigo-400 focus:bg-white cursor-pointer font-medium text-slate-700"
                    >
                      <option value="MIT">MIT License</option>
                      <option value="Apache-2.0">Apache 2.0 License</option>
                      <option value="GPL-3.0">GNU GPL v3.0</option>
                      <option value="BSD-3-Clause">BSD 3-Clause "New" / "Revised" License</option>
                      <option value="Unlicense">The Unlicense (Public Domain)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">High-Level Purpose & Scope Summary</label>
                  <textarea
                    rows={2}
                    value={projectData.purpose}
                    onChange={(e) => setProjectData(v => ({ ...v, purpose: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white resize-none"
                    placeholder="Provide a 2-3 sentence overview."
                  />
                </div>

                {/* AI Custom Logo Creator */}
                <div className="mt-2 border-t border-slate-100 pt-4">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> AI Graphical Identity (Logo / Favicon)
                  </span>
                  <div className="mt-2.5 flex items-center gap-4 bg-slate-50/50 p-3.5 rounded-xl border border-slate-150">
                    {projectData.logoUrl ? (
                      <div className="relative shrink-0 w-16 h-16 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-1 shadow-sm group">
                        <img src={projectData.logoUrl} className="w-full h-full object-contain" alt="Project logo" />
                        <button
                          onClick={() => {
                            setProjectData(prev => ({ ...prev, logoUrl: undefined }));
                            setLogoGenerationType(null);
                          }}
                          className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="shrink-0 w-16 h-16 bg-slate-100/80 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400">
                        <Sparkles className="w-6 h-6 text-slate-300" />
                      </div>
                    )}

                    <div className="flex-grow overflow-hidden">
                      <p className="text-[11px] text-slate-600 font-medium">
                        {projectData.logoUrl 
                          ? `Custom logo successfully generated using ${logoGenerationType === 'imagen' ? 'Imagen SDK' : 'Gemini Vector engine'}. It will be added right at the top of your generated README.md!`
                          : "Create a tailored representative logo banner based on your project's objective using Gemini / Imagen AI engines."}
                      </p>
                      
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={handleGenerateLogo}
                          disabled={logoLoading}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {logoLoading ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" /> Designing Brand...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" /> 
                              {projectData.logoUrl ? "Regenerate Logo" : "Generate Custom Logo"}
                            </>
                          )}
                        </button>
                        
                        {projectData.logoUrl && (
                          <button
                            onClick={() => {
                              setProjectData(prev => ({ ...prev, logoUrl: undefined }));
                              setLogoGenerationType(null);
                            }}
                            className="px-2.5 py-1.5 bg-slate-150 text-slate-600 hover:text-slate-800 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-all cursor-pointer"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>
                      
                      {logoError && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1.5">⚠️ {logoError}</p>
                      )}

                      {logoWarning && (
                        <p className="text-[10px] text-amber-600 font-semibold mt-1.5 bg-amber-50 border border-amber-150 rounded-lg p-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {logoWarning}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Features Builder */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                  Core Features list
                </h3>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFeature()}
                    className="flex-grow rounded-lg border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                    placeholder="e.g., Active token rotation mechanism"
                  />
                  <button
                    onClick={addFeature}
                    className="px-4 py-2.5 bg-indigo-50 border border-indigo-100 font-semibold cursor-pointer text-indigo-700 text-xs rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-1">
                  {projectData.features.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No features specified yet.</span>
                  )}
                  {projectData.features.map((feature, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs text-slate-700 border border-slate-100">
                      <span>• {feature}</span>
                      <button onClick={() => removeFeature(i)} className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Tech Stack & Badges format */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Code className="w-4 h-4 text-slate-400" />
                  Tech Stack Matrix
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Backend column */}
                  <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest text-center">Backend Technologies</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newBackendTech}
                        onChange={(e) => setNewBackendTech(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addBackendTech()}
                        className="w-full rounded-md border-slate-200 bg-white p-1.5 text-[11px] outline-none"
                        placeholder="Add Tech"
                      />
                      <button onClick={addBackendTech} className="p-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 cursor-pointer">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {projectData.techStack.backend.map(t => (
                        <span key={t} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-200/60 border border-slate-200 text-[10px] text-slate-700 font-medium">
                          {t}
                          <button onClick={() => removeBackendTech(t)} className="text-slate-400 hover:text-rose-600 cursor-pointer">×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Frontend column */}
                  <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest text-center">Frontend Technologies</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newFrontendTech}
                        onChange={(e) => setNewFrontendTech(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addFrontendTech()}
                        className="w-full rounded-md border-slate-200 bg-white p-1.5 text-[11px] outline-none"
                        placeholder="Add Tech"
                      />
                      <button onClick={addFrontendTech} className="p-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 cursor-pointer">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {projectData.techStack.frontend.map(t => (
                        <span key={t} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-200/60 border border-slate-200 text-[10px] text-slate-700 font-medium">
                          {t}
                          <button onClick={() => removeFrontendTech(t)} className="text-slate-400 hover:text-rose-600 cursor-pointer">×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Other / Database column */}
                  <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest text-center">Databases & Other</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newOtherTech}
                        onChange={(e) => setNewOtherTech(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addOtherTech()}
                        className="w-full rounded-md border-slate-200 bg-white p-1.5 text-[11px] outline-none"
                        placeholder="Add Tech"
                      />
                      <button onClick={addOtherTech} className="p-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 cursor-pointer">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {projectData.techStack.other.map(t => (
                        <span key={t} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-200/60 border border-slate-200 text-[10px] text-slate-700 font-medium">
                          {t}
                          <button onClick={() => removeOtherTech(t)} className="text-slate-400 hover:text-rose-600 cursor-pointer">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Security Details & Rate-limiting constraints */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  Security Specifications & Rate Limiting details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Rate-limiting Constraints</label>
                    <textarea
                      rows={3}
                      value={projectData.rateLimits}
                      onChange={(e) => setProjectData(v => ({ ...v, rateLimits: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white resize-none"
                      placeholder="e.g., 60 requests/minute. Return code 429."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">OAuth2 auth instructions</label>
                    <textarea
                      rows={3}
                      value={projectData.securityDetails}
                      onChange={(e) => setProjectData(v => ({ ...v, securityDetails: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border-slate-200 bg-slate-50/50 p-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white resize-none"
                      placeholder="e.g. Scopes requirement, Dynamic key rotation details..."
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: OAuth2 Scopes Management */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-500" />
                    Define OAuth2 Scopes
                  </h3>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal">
                  Customize permission scopes that secure your API endpoints. These are automatically reflected in your interactive issuer sandbox, request code generators, and standard markdown document outputs.
                </p>

                {/* Scope listing */}
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {(!projectData.oauthScopes || projectData.oauthScopes.length === 0) ? (
                    <span className="text-xs text-slate-400 italic font-mono">No custom scopes defined yet. Defaulters will be loaded on preset change.</span>
                  ) : (
                    projectData.oauthScopes.map((sc, i) => (
                      <div key={sc.name || i} className="flex items-start justify-between p-2 rounded-lg bg-slate-50 border border-slate-150 gap-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-extrabold text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded w-max">
                            {sc.name}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-1">
                            {sc.description}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProjectData(prev => ({
                              ...prev,
                              oauthScopes: (prev.oauthScopes || []).filter((_, idx) => idx !== i)
                            }));
                          }}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new scope inputs */}
                <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 flex flex-col gap-2.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">➕ Add Security scope</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase">Scope ID (e.g. read:reports)</label>
                      <input
                        type="text"
                        value={newScopeName}
                        onChange={(e) => setNewScopeName(e.target.value)}
                        placeholder="read:reports"
                        className="w-full text-xs font-mono p-1.5 bg-white border border-slate-200 rounded outline-none text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase">Scope Description</label>
                      <input
                        type="text"
                        value={newScopeDescription}
                        onChange={(e) => setNewScopeDescription(e.target.value)}
                        placeholder="Read financial charts"
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded outline-none text-slate-800"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const trimmedName = newScopeName.trim();
                      const trimmedDesc = newScopeDescription.trim();
                      if (!trimmedName || !trimmedDesc) return;
                      
                      setProjectData(prev => ({
                        ...prev,
                        oauthScopes: [...(prev.oauthScopes || []), { name: trimmedName, description: trimmedDesc }]
                      }));
                      setNewScopeName("");
                      setNewScopeDescription("");
                    }}
                    className="py-1.5 bg-indigo-600 hover:bg-slate-900 text-white rounded text-[11px] font-semibold cursor-pointer text-center shadow-xs"
                  >
                    Add Scope to Project Context
                  </button>
                </div>
              </div>
            </div>

            {/* Right Hand Endpoint Builder and tree structure */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Directory structure selector */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  Folder Tree Structure (`text` layout)
                </h3>
                <textarea
                  rows={6}
                  value={projectData.folderStructure}
                  onChange={(e) => setProjectData(v => ({ ...v, folderStructure: e.target.value }))}
                  className="block w-full font-mono rounded-lg border-slate-200 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 leading-normal"
                />
              </div>

              {/* API Endpoint Designer */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Compass className="w-4 h-4 text-slate-400" />
                  Define API Endpoints
                </h3>

                <div className="flex flex-col gap-3 border border-slate-150 p-4 rounded-xl bg-slate-50/40">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">New Route Spec</span>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Method</label>
                      <select
                        value={newEndpoint.method}
                        onChange={(e: any) => setNewEndpoint(v => ({ ...v, method: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-slate-200 bg-white p-1 text-[11px]"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Path</label>
                      <input
                        type="text"
                        value={newEndpoint.path}
                        onChange={(e) => setNewEndpoint(v => ({ ...v, path: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-slate-200 bg-white p-1 text-[11px]"
                        placeholder="/api/v1/resource"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Description</label>
                    <input
                      type="text"
                      value={newEndpoint.description}
                      onChange={(e) => setNewEndpoint(v => ({ ...v, description: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-slate-200 bg-white p-1 text-[11px]"
                    />
                  </div>

                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edit-ep-auth"
                        checked={newEndpoint.authRequired}
                        onChange={(e) => setNewEndpoint(v => ({ ...v, authRequired: e.target.checked }))}
                      />
                      <label htmlFor="edit-ep-auth" className="text-[11px] text-slate-600 font-semibold cursor-pointer">Requires OAuth2 Bearer Authorization</label>
                    </div>

                    {newEndpoint.authRequired && (
                      <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg flex flex-col gap-1.5 align-left">
                        <span className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-wider block">Access Scopes Binding</span>
                        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                          {(projectData.oauthScopes || []).map((sc) => {
                            const activeScopes = newEndpoint.scopes || [];
                            const isSelected = activeScopes.includes(sc.name);
                            return (
                              <label key={sc.name} className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer hover:text-slate-800">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(evt) => {
                                    const updated = evt.target.checked
                                      ? [...activeScopes, sc.name]
                                      : activeScopes.filter(s => s !== sc.name);
                                    setNewEndpoint(v => ({ ...v, scopes: updated }));
                                  }}
                                  className="w-3 h-3 cursor-pointer"
                                />
                                <span className="font-mono font-bold text-indigo-600">{sc.name}</span>
                                <span className="text-[9px] text-slate-400">({sc.description})</span>
                              </label>
                            );
                          })}
                          {(!projectData.oauthScopes || projectData.oauthScopes.length === 0) && (
                            <span className="text-[9px] text-slate-400 italic">No custom scopes defined yet. Add them in Section 5 on the left column.</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom Header Specification form */}
                  <div className="flex flex-col gap-2 border-t border-slate-100 pt-2.5">
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block text-left">Route Custom HTTP Headers</span>
                    
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {(newEndpoint.headers || []).map((h, hIdx) => (
                        <span key={hIdx} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-250 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600">
                          <span className="font-mono text-indigo-600 font-bold">{h.key}</span>: <span>{h.value}</span>
                          <button
                            type="button"
                            onClick={() => setNewEndpoint(prev => ({
                              ...prev,
                              headers: (prev.headers || []).filter((_, idx) => idx !== hIdx)
                            }))}
                            className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {(!newEndpoint.headers || newEndpoint.headers.length === 0) && (
                        <span className="text-[9px] text-slate-400 italic block text-left">No custom headers bound on this endpoint. Configure below.</span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1 px-1.5 py-1 bg-slate-50 rounded border border-slate-150">
                      <input
                        type="text"
                        placeholder="e.g. X-API-Key"
                        id="form-c-header-key"
                        className="text-[10px] p-1 bg-white border border-slate-200 rounded outline-none text-slate-800"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const btn = document.getElementById("add-h-trigger-btn");
                            btn?.click();
                          }
                        }}
                      />
                      <input
                        type="text"
                        placeholder="e.g. key_v1"
                        id="form-c-header-val"
                        className="text-[10px] p-1 bg-white border border-slate-200 rounded outline-none text-slate-800"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const btn = document.getElementById("add-h-trigger-btn");
                            btn?.click();
                          }
                        }}
                      />
                      <button
                        type="button"
                        id="add-h-trigger-btn"
                        onClick={() => {
                          const kEl = document.getElementById("form-c-header-key") as HTMLInputElement;
                          const vEl = document.getElementById("form-c-header-val") as HTMLInputElement;
                          const key = kEl?.value?.trim();
                          const val = vEl?.value?.trim() || "";
                          if (key) {
                            setNewEndpoint(prev => ({
                              ...prev,
                              headers: [...(prev.headers || []), { key, value: val, description: "Custom Spec Header" }]
                            }));
                            kEl.value = "";
                            vEl.value = "";
                          }
                        }}
                        className="text-[9px] py-1 bg-slate-800 text-white rounded font-bold hover:bg-slate-900 cursor-pointer text-center"
                      >
                        + Bound Header
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Request Body Example</label>
                      <textarea
                        rows={3}
                        value={newEndpoint.requestBody}
                        onChange={(e) => setNewEndpoint(v => ({ ...v, requestBody: e.target.value }))}
                        className="mt-1 block w-full font-mono bg-white border border-slate-200 p-1 text-[10px]"
                        placeholder="{}"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Response Body Example</label>
                      <textarea
                        rows={3}
                        value={newEndpoint.responseBody}
                        onChange={(e) => setNewEndpoint(v => ({ ...v, responseBody: e.target.value }))}
                        className="mt-1 block w-full font-mono bg-white border border-slate-200 p-1 text-[10px]"
                        placeholder="{}"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddNewEndpoint}
                    className="mt-1 py-1.5 bg-indigo-600 text-white font-semibold cursor-pointer text-xs rounded-md shadow hover:bg-indigo-700 transition-colors"
                  >
                    Save Endpoint Entry
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Active Routes Registry ({projectData.endpoints.length})</span>
                  {projectData.endpoints.map((ep, idx) => (
                    <div key={ep.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-150">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${ep.method === 'GET' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {ep.method}
                        </span>
                        <span className="text-xs font-mono truncate text-slate-700">{ep.path}</span>
                      </div>
                      <button onClick={() => removeEndpointIndex(idx)} className="text-rose-500 hover:text-rose-700 transition-colors p-1 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated results review */}
            <div className="lg:col-span-12">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-indigo-500" />
                    Generated README & API Specifications File
                  </h3>
                  {hasGeneratedCode ? (
                    <p className="text-xs text-indigo-600 font-semibold bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 mt-2">
                      🎉 Fully optimized and written by <strong>Gemini 3.5 Flash</strong> using live technical criteria, dynamic rate-limiting structures, and full compliance features specified in the prompt!
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">
                      Showing system baseline Markdown layout. To update standard layouts based on the active presets, click the "Generate with Gemini" button above.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {developerInsights && (
                    <div className="md:col-span-1 bg-yellow-50/60 p-4 rounded-xl border border-yellow-100 flex flex-col gap-2">
                      <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-amber-600" /> Technical Best-Practices & Insights
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">{developerInsights}</p>
                    </div>
                  )}

                  <div className={developerInsights ? "md:col-span-2" : "md:col-span-3"}>
                    <MarkdownView markdown={generatedMarkdown} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== INTERACTIVE DEVELOPER HUB / PORTAL VIEW ==================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Third-column left sidebar */}
            <div className="lg:col-span-3 border-r border-slate-200/80 bg-slate-50/60 p-5 flex flex-col gap-6">
              <div>
                <h3 className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">Developer Index</h3>
                
                {/* Searchable Index Bar */}
                <div className="relative mt-2">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs px-2.5 py-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={portalSearchQuery}
                      onChange={(e) => setPortalSearchQuery(e.target.value)}
                      placeholder="Search index or terms..."
                      className="w-full text-xs font-medium text-slate-700 placeholder-slate-400 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 p-0"
                    />
                    {portalSearchQuery && (
                      <button 
                        onClick={() => setPortalSearchQuery("")}
                        className="text-[10px] text-slate-400 hover:text-slate-600 px-1 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Real-time search result index matching */}
                  {portalSearchQuery.trim() !== "" && (
                    <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-lg shadow-lg max-h-60 overflow-y-auto p-1.5 flex flex-col gap-1">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 border-b border-slate-100 mb-1">
                        Matched Diagnostics
                      </div>
                      {(() => {
                        const query = portalSearchQuery.toLowerCase();
                        const items: { type: "tab" | "endpoint"; label: string; sublabel: string; id: string; method?: string }[] = [];

                        // Search core documentation tabs
                        const docs = [
                          { id: "readme", label: "README Introduction", kw: "guide overview markdown markdownview text home" },
                          { id: "api-explorer", label: "Sandbox & Playground", kw: "explorer sandbox play curl payload endpoint test scenarios" },
                          { id: "oauth2", label: "OAuth 2.0 Auth Gate", kw: "oauth scopes authorize jwt validation tokens payload keys credentials" },
                          { id: "rate-limiting", label: "Rate Limiting & Telemetry", kw: "rate threshold reset headers backoff metrics latency curves chart" },
                          { id: "security", label: "Security & Auditing", kw: "cryptography rotational vaults secrets audits security rules" },
                          { id: "versions", label: "Versions Changelog", kw: "versions branch snapshots logs releases rollback draft" }
                        ];

                        docs.forEach(d => {
                          if (d.label.toLowerCase().includes(query) || d.kw.toLowerCase().includes(query)) {
                            items.push({ type: "tab", label: d.label, sublabel: "Tab Section Navigation", id: d.id });
                          }
                        });

                        // Search actual endpoint registries
                        projectData.endpoints.forEach(ep => {
                          if (ep.path.toLowerCase().includes(query) || ep.description.toLowerCase().includes(query) || ep.method.toLowerCase().includes(query)) {
                            items.push({ type: "endpoint", label: ep.path, sublabel: ep.description, id: ep.id, method: ep.method });
                          }
                        });

                        if (items.length === 0) {
                          return <div className="text-[11px] text-slate-400 text-center py-3">No matched definitions found</div>;
                        }

                        return items.map((itm, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (itm.type === "tab") {
                                setPortalTab(itm.id as any);
                              } else {
                                setPortalTab("api-explorer");
                                setActiveEndpointId(itm.id);
                              }
                              setPortalSearchQuery("");
                            }}
                            className="w-full text-left p-2 rounded-md hover:bg-indigo-50/50 transition-colors cursor-pointer flex flex-col"
                          >
                            <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                              {itm.method && (
                                <span className={`px-1 rounded text-[8px] font-bold ${itm.method === 'GET' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-800'}`}>
                                  {itm.method}
                                </span>
                              )}
                              {itm.label}
                            </span>
                            <span className="text-[9px] text-slate-500 truncate mt-0.5 leading-none">{itm.sublabel}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                <nav className="flex flex-col gap-1 mt-3">
                  <button
                    onClick={() => setPortalTab("readme")}
                    className={`w-full px-4 py-2.5 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${portalTab === "readme" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"}`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    README Introduction
                  </button>
                  <button
                    onClick={() => setPortalTab("api-explorer")}
                    className={`w-full px-4 py-2.5 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${portalTab === "api-explorer" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"}`}
                  >
                    <Terminal className="w-4 h-4 shrink-0" />
                    Interactive Sandbox
                  </button>
                  <button
                    onClick={() => setPortalTab("oauth2")}
                    className={`w-full px-4 py-2.5 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${portalTab === "oauth2" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"}`}
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    OAuth2.0 Token Issuer
                  </button>
                  <button
                    onClick={() => setPortalTab("rate-limiting")}
                    className={`w-full px-4 py-2.5 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${portalTab === "rate-limiting" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"}`}
                  >
                    <Activity className="w-4 h-4 shrink-0" />
                    Rate Limits Simulator
                  </button>
                  <button
                    onClick={() => setPortalTab("security")}
                    className={`w-full px-4 py-2.5 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${portalTab === "security" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"}`}
                  >
                    <Shield className="w-4 h-4 shrink-0" />
                    Key Rotation Helper
                  </button>
                  <button
                    onClick={() => setPortalTab("versions")}
                    className={`w-full px-4 py-2.5 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${portalTab === "versions" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"}`}
                  >
                    <GitBranch className="w-4 h-4 shrink-0" />
                    Real-time Revisions
                  </button>
                </nav>
              </div>

              {/* API Endpoints Navigator (only if exploring raw routing methods) */}
              {portalTab === "api-explorer" && (
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">Select Endpoint</span>
                  <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                    {projectData.endpoints.map(ep => (
                      <button
                        key={ep.id}
                        onClick={() => selectEndpoint(ep.id)}
                        className={`p-2.5 rounded-lg border text-left text-xs font-mono transition-all overflow-hidden flex items-center gap-2 shrink-0 cursor-pointer ${activeEndpointId === ep.id ? 'bg-slate-900 border-slate-900 text-slate-100' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                      >
                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${ep.method === 'GET' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
                          {ep.method}
                        </span>
                        <span className="truncate">{ep.path}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick statistics tracker overlay */}
              <div className="p-4 bg-slate-900 text-slate-300 rounded-xl border border-slate-800 flex flex-col gap-3 mt-auto">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" /> Platform Status
                </span>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                    <span className="text-[9px] text-slate-400 block font-semibold">API LIMIT</span>
                    <span className="text-xs font-mono font-bold text-white">{rateLimitMax}/min</span>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                    <span className="text-[9px] text-slate-400 block font-semibold">AVAILABLE</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{rateLimitRemaining}</span>
                  </div>
                </div>
                {isRateLimited ? (
                  <div className="p-1 px-2.5 rounded bg-rose-950 text-[10px] text-rose-300 font-bold border border-rose-900 text-center animate-pulse">
                    ⚠️ Lockout Active ({rateLimitResetTime}s)
                  </div>
                ) : (
                  <div className="p-1 px-2.5 rounded bg-emerald-950 text-[10px] text-emerald-300 font-bold border border-emerald-900 text-center">
                    🟢 Connection Secure
                  </div>
                )}
              </div>
            </div>

            {/* Middle and Right Render screen */}
            <div className="lg:col-span-9 p-6 md:p-8">
              {portalTab === "readme" && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
                        📖 Project Documentation Readme
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Rendered layout of the standard markdown output including shield badges and author tables.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Copy Markdown button */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedMarkdown);
                          setReadmeCopied(true);
                          setTimeout(() => setReadmeCopied(false), 2000);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 border ${
                          readmeCopied 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {readmeCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-500" />}
                        {readmeCopied ? "Markdown Copied!" : "Copy Raw Markdown"}
                      </button>

                      {/* Download README.md button */}
                      <button
                        onClick={() => {
                          const element = document.createElement("a");
                          const file = new Blob([generatedMarkdown], {type: 'text/markdown;charset=utf-8'});
                          element.href = URL.createObjectURL(file);
                          element.download = "README.md";
                          document.body.appendChild(element);
                          element.click();
                          document.body.removeChild(element);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 shadow"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-200" />
                        Download README.md
                      </button>
                    </div>
                  </div>
                  <MarkdownView markdown={generatedMarkdown} />
                </div>
              )}

              {portalTab === "api-explorer" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-12">
                    <h2 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
                      ⚡ Standard Endpoint Playground Reference
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Select an endpoint from the left menu index to test authentications, handle mock request buffers, view client templates, and evaluate rate limit rules.
                    </p>
                  </div>

                  {/* Left Column: Sandbox Forms */}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    {selectedEndpoint ? (
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/80 flex flex-col gap-5">
                        <div className="flex justify-between items-start gap-4 flex-wrap pb-3 border-b border-slate-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold leading-none uppercase ${selectedEndpoint.method === 'GET' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                {selectedEndpoint.method}
                              </span>
                              <span className="text-sm font-mono font-semibold text-slate-800">{selectedEndpoint.path}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 italic font-sans">{selectedEndpoint.description}</p>
                          </div>
                          {selectedEndpoint.authRequired && (
                            <span className="px-2.5 py-1 bg-yellow-100 border border-yellow-200 text-yellow-800 rounded-full font-semibold text-[10px] flex items-center gap-1 shrink-0">
                              <Lock className="w-3 h-3" /> OAuth2 JWT Required
                            </span>
                          )}
                        </div>

                        {/* JWT Input if active */}
                        {selectedEndpoint.authRequired && (
                          <div className="flex flex-col gap-2 bg-yellow-50/60 p-4 rounded-xl border border-yellow-200/70">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest flex items-center gap-1">
                                <Key className="w-3.5 h-3.5" /> Authorization Header Token
                              </label>
                              <button
                                onClick={handleGenerateMockToken}
                                className="text-[10px] text-amber-800 hover:text-white bg-amber-200/60 hover:bg-amber-600 border border-amber-300 rounded px-2 py-0.5 font-bold transition-all cursor-pointer"
                              >
                                {mockToken ? "Regenerate JWToken" : "Auto-Generate Mock JWT Bearer"}
                              </button>
                            </div>
                            <input
                              type="text"
                              value={mockToken}
                              onChange={(e) => setMockToken(e.target.value)}
                              className="w-full font-mono text-[10px] p-2 bg-white rounded border border-yellow-300 outline-none text-slate-800"
                              placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3My..."
                            />
                            <p className="text-[9px] text-amber-700">Providing an empty header token will simulate a 401 Unauthorized oauth gate failure response block.</p>
                          </div>
                        )}

                        {/* Request Body Payload */}
                        {selectedEndpoint.requestBody && selectedEndpoint.method !== "GET" && (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">HTTP Request Body</span>
                            <textarea
                              rows={5}
                              value={sandboxRequestBody}
                              onChange={(e) => setSandboxRequestBody(e.target.value)}
                              className="font-mono text-xs w-full p-3 bg-white rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        )}

                        <button
                          onClick={testSandboxQuery}
                          disabled={sandboxLoading}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs tracking-wider transition-colors cursor-pointer shadow flex items-center justify-center gap-2 active:scale-98"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {sandboxLoading ? "Processing response package..." : "Send Request & Monitor Sandbox"}
                        </button>

                        {/* ============= AUTOMATED TEST SUITE RUNNER ============= */}
                        <div className="mt-6 border-t border-slate-200 pt-5 flex flex-col gap-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                              <PlayCircle className="w-4 h-4 text-indigo-500" /> Automated test scenarios ({selectedEndpoint.scenarios?.length || 1})
                            </span>
                            <button
                              onClick={runAutomatedTestSuite}
                              disabled={isTestingSuiteRunning}
                              className="px-3 py-1 bg-slate-900 text-white text-[10px] font-semibold rounded-lg shadow-sm hover:bg-indigo-600 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {isTestingSuiteRunning ? "Executing Suite..." : "Run Scenario Test Suite"}
                            </button>
                          </div>

                          {/* Scenarios Checklist / results table */}
                          <div className="flex flex-col gap-2.5">
                            {/* Predefined scenarios looping */}
                            {(selectedEndpoint.scenarios || [
                              {
                                id: "scen-auto-success-default",
                                name: "Full Authentication Gateway Sweep (Expected 200 OK)",
                                expectedStatus: 200,
                                isAuthValid: true,
                                simulateRateLimit: false
                              }
                            ]).map((scen, idx) => {
                              const testRes = testSuiteResults.find(r => r.id === scen.id);
                              return (
                                <div key={scen.id || idx} className="p-3 bg-white border border-slate-150 rounded-lg flex items-center justify-between">
                                  <div>
                                    <h5 className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                                      <CheckSquare className="w-3 h-3 text-slate-400" /> {scen.name}
                                    </h5>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[9px] font-mono text-slate-400 bg-slate-100 p-0.5 px-1 rounded">
                                        Expected: {scen.expectedStatus} HTTP
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-400">
                                        Auth: {scen.isAuthValid ? "Valid" : "None"} | Burst: {scen.simulateRateLimit ? "Yes" : "No"}
                                      </span>
                                    </div>
                                  </div>

                                  {testRes ? (
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${testRes.result === 'PASS' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
                                      {testRes.result} ({testRes.actualStatus})
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400 shrink-0 font-medium italic">Pending...</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Define expected success/failure scenario additions form */}
                          <div className="bg-slate-100/65 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                            <h5 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                              ➕ Define Expected Test Scenario
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="col-span-2">
                                <label className="block text-[9px] text-slate-500 font-bold uppercase">Scenario Name / Vibe</label>
                                <input
                                  type="text"
                                  value={newScenarioName}
                                  onChange={(e) => setNewScenarioName(e.target.value)}
                                  className="w-full text-[10px] p-2 bg-white rounded border border-slate-200 outline-none text-slate-700"
                                  placeholder="e.g. Invalid Body parameters fail"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-500 font-bold uppercase">Expected Status Code</label>
                                <select
                                  value={newScenarioExpectedStatus}
                                  onChange={(e) => setNewScenarioExpectedStatus(Number(e.target.value))}
                                  className="w-full text-[10px] p-2 bg-white rounded border border-slate-200 outline-none text-slate-700"
                                >
                                  <option value={200}>200 (Success)</option>
                                  <option value={400}>400 (Bad Request)</option>
                                  <option value={401}>401 (Unauthorized)</option>
                                  <option value={402}>402 (Payment Error)</option>
                                  <option value={429}>429 (Rate Limited)</option>
                                </select>
                              </div>
                              <div className="flex flex-col justify-center gap-1">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    id="isAuthCheckbox"
                                    checked={newScenarioIsAuthValid}
                                    onChange={(e) => setNewScenarioIsAuthValid(e.target.checked)}
                                    className="cursor-pointer"
                                  />
                                  <label htmlFor="isAuthCheckbox" className="text-[10px] text-slate-600 font-medium cursor-pointer">Inject active Auth Key</label>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    id="burstCheckbox"
                                    checked={newScenarioSimulateRateLimit}
                                    onChange={(e) => setNewScenarioSimulateRateLimit(e.target.checked)}
                                    className="cursor-pointer"
                                  />
                                  <label htmlFor="burstCheckbox" className="text-[10px] text-slate-600 font-medium cursor-pointer">Simulate Burst Spikes (429)</label>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                if (!newScenarioName.trim()) return;
                                const id = "scen-" + Math.random().toString(36).substr(2, 9);
                                const newScenObj: TestScenario = {
                                  id,
                                  name: newScenarioName,
                                  expectedStatus: Number(newScenarioExpectedStatus),
                                  mockResponse: "{\n  \"success\": true\n}",
                                  isAuthValid: newScenarioIsAuthValid,
                                  simulateRateLimit: newScenarioSimulateRateLimit
                                };

                                setProjectData(prev => ({
                                  ...prev,
                                  endpoints: prev.endpoints.map(e => e.id === activeEndpointId ? {
                                    ...e,
                                    scenarios: [...(e.scenarios || []), newScenObj]
                                  } : e)
                                }));

                                setNewScenarioName("");
                                setNewScenarioExpectedStatus(200);
                                setNewScenarioIsAuthValid(true);
                                setNewScenarioSimulateRateLimit(false);
                              }}
                              className="py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold cursor-pointer shadow-xs transition-all"
                            >
                              Add Scenario to Route Specification
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                        No active endpoints specified. Switch back to Editor to register custom routes.
                      </div>
                    )}
                  </div>

                  {/* Right Column: Code snippets and Playground simulation results */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Sandbox simulation results */}
                    <div className="bg-slate-950 text-slate-100 rounded-xl border border-slate-800 overflow-hidden shadow-md flex flex-col font-mono text-xs">
                      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800">
                        <span className="text-[10px] text-slate-400 font-sans tracking-wide">CONSOLE OUTPUT</span>
                        {sandboxStatus && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sandboxStatus === 200 ? 'bg-emerald-900/60 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                            {sandboxStatus} {sandboxStatus === 200 ? "OK" : sandboxStatus === 429 ? "Too Many Requests" : "Unauthorized"}
                          </span>
                        )}
                      </div>
                      <div className="p-4 flex-grow min-h-60 overflow-y-auto">
                        {sandboxResponse ? (
                          <div className="flex flex-col gap-4">
                            <div>
                              <span className="text-[9px] text-slate-400 block font-sans">RESPONSE HEADERS:</span>
                              <pre className="text-[10px] text-orange-300 leading-normal whitespace-pre-wrap">
                                {JSON.stringify(sandboxHeaders, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block font-sans">RESPONSE PAYLOAD:</span>
                              <pre className="text-[11px] text-slate-200 leading-relaxed whitespace-pre-wrap">
                                {JSON.stringify(sandboxResponse, null, 2)}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic block mt-12 text-center">Click "Send Request" to trigger a high-fidelity endpoint run.</span>
                        )}
                      </div>
                    </div>

                    {/* Auto-compiled language code snippet panel */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between border-b border-slate-200">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-sans">Client Code Generator</span>
                        <div className="inline-flex rounded-md p-0.5 bg-slate-200">
                          <button
                            onClick={() => setCodeLang("curl")}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${codeLang === 'curl' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                          >
                            curl
                          </button>
                          <button
                            onClick={() => setCodeLang("typescript")}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${codeLang === 'typescript' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                          >
                            TS
                          </button>
                          <button
                            onClick={() => setCodeLang("python")}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${codeLang === 'python' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                          >
                            Python
                          </button>
                          <button
                            onClick={() => setCodeLang("php")}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${codeLang === 'php' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                          >
                            PHP
                          </button>
                          <button
                            onClick={() => setCodeLang("java")}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${codeLang === 'java' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                          >
                            Java
                          </button>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre max-h-56">
                        {generateSnippet(codeLang, selectedEndpoint)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {portalTab === "oauth2" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
                      🔒 OAuth2.0 Client credentials Authentication Protocol
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Integrations must support standard header exchanges. Learn step-by-step token rotative requirements.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col gap-4 text-xs text-slate-600">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Key className="w-4 h-4 text-indigo-500" /> Token Request Workflow
                      </h4>
                      <p>
                        Clients exchange credentials directly for JWT tokens at our authorization route. The header must contain standard Bearer authorization credentials.
                      </p>
                      <div className="bg-slate-900 p-4 rounded-lg font-mono text-[10px] text-amber-200">
                        {`POST /api/v1/oauth/token\nHost: api.${projectData.projectName.toLowerCase()}.com\nContent-Type: application/json\n\n{\n  "client_id": "YOUR_CLIENT_ID",\n  "client_secret": "YOUR_CLIENT_SECRET",\n  "grant_type": "client_credentials"\n}`}
                      </div>
                      <h5 className="font-bold text-slate-700 mt-2">Example client response schema:</h5>
                      <div className="bg-slate-900 p-4 rounded-lg font-mono text-[10px] text-emerald-300">
                        {`{\n  "access_token": "hp_jwt_eyJhb...",\n  "token_type": "Bearer",\n  "expires_in": 3600,\n  "scope": "read:profile"\n}`}
                      </div>
                    </div>

                    <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 flex flex-col gap-4 text-xs text-slate-600">
                      <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-600" /> OAuth2 Security Compliance Checklist
                      </h4>
                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span><strong>Https Enforcement:</strong> All exchanges must reside exclusively inside HTTPS pipelines.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span><strong>Dynamic Secret Rotation:</strong> Programmatically rotate the Client Secret values at least every 90 days.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span><strong>Scope Hardness:</strong> Token scopes should adhere exactly to the Least-Privilege mandate (e.g. do not request write access for polling routines).</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span><strong>Cryptographic Strength:</strong> All issuer signatures utilize RSASHA256 keys to eliminate tamper opportunities.</span>
                      </div>
                    </div>

                    {/* Project Custom OAuth2 Scopes Matrix inside Developer Sandbox */}
                    <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-3 font-sans shadow-xs">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Lock className="w-4 h-4 text-indigo-500" /> Authorized OAuth2 Scopes Registry
                      </h4>
                      <p className="text-xs text-slate-500">
                        The Authorization Server token payloads authorize clients executing transaction cycles in the production gateway with the following permission bindings:
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-2">
                        {(projectData.oauthScopes || []).map((sc, scIdx) => (
                          <div key={scIdx} className="bg-slate-50 border border-slate-150 p-3 rounded-lg flex flex-col gap-1.5 hover:border-indigo-200 hover:bg-slate-50/50 transition-all text-left">
                            <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded w-max">
                              {sc.name}
                            </span>
                            <span className="text-[11px] text-slate-600 leading-normal block">
                              {sc.description}
                            </span>
                          </div>
                        ))}
                        {(!projectData.oauthScopes || projectData.oauthScopes.length === 0) && (
                          <p className="text-xs text-slate-400 italic p-4 text-center col-span-full">No active scopes registered inside configuration files.</p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {portalTab === "rate-limiting" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
                      ⚡ Rate Limiting & API Observability Telemetry
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Our gateway features a sliding window limit. Test resilience by executing requests rapidly in the Sandbox or simulating a heavy traffic spike load below.
                    </p>
                  </div>

                  {/* Recharts Analytics Graphs */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Latency Area Chart */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gateway Processing Latency (ms)</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Real-time processing latency including OAuth authentication overhead.</p>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-[10px] font-bold">
                          Avg: ~150ms
                        </span>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={latencyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="latencyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} stroke="#6366f1" />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} />
                            <YAxis stroke="#94a3b8" fontSize={9} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", color: "#f8fafc", fontSize: "11px" }} />
                            <Area type="monotone" dataKey="latency" name="Latency (ms)" stroke="#6366f1" strokeWidth={2} fill="url(#latencyGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Request Volume Bar Chart */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Simulated Traffic Load (Req/sec)</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">API request intensity compared against standard lockout threshold.</p>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded text-[10px] font-bold">
                          Threshold: 10 req
                        </span>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={latencyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} />
                            <YAxis stroke="#94a3b8" fontSize={9} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", color: "#f8fafc", fontSize: "11px" }} />
                            <Bar dataKey="load" name="Req Rate" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Simulator Trigger */}
                  <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-slate-100 p-6 rounded-xl border border-slate-800 shadow-md flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-cyan-400" /> API Gateway Traffic Load Sandbox
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        Simulate a sudden burst of high-concurrency client requests. This will push telemetry updates to the charts, demonstrate exponential backoff backpressures, and trigger automated HTTP 429 warnings.
                      </p>
                    </div>
                    <button
                      onClick={triggerTrafficSpikeSimulation}
                      className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow cursor-pointer uppercase tracking-wider shrink-0 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950" /> Simulate Burst Spike
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Standard Headers Map</h4>
                      <p className="mb-4">Standard Rate Limit properties returned inside every HTTP request response payload:</p>
                      <ul className="flex flex-col gap-2 font-mono text-[10px]">
                        <li className="bg-white p-2 rounded border border-slate-150"><strong>X-RateLimit-Limit:</strong> Total allowed request operations per minute.</li>
                        <li className="bg-white p-2 rounded border border-slate-150"><strong>X-RateLimit-Remaining:</strong> Current available slots remaining for active window.</li>
                        <li className="bg-white p-2 rounded border border-slate-150"><strong>Retry-After:</strong> Recovery seconds backoff required.</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 md:col-span-2">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Exponential Backoff Client Code implementation</h4>
                      <p className="mb-2">Implement standard auto recovery delay times in TypeScript before repeating failed executions:</p>
                      <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[10px] leading-relaxed">
                        {`async function fetchWithExponentialBackoff(url, options, retries = 3, delay = 1000) {\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429 && retries > 0) {\n      const retryAfter = response.headers.get("Retry-After") || (delay / 1000);\n      console.warn('Block 429 detected. Backoff for ' + retryAfter + 's');\n      await new Promise(res => setTimeout(res, retryAfter * 1000));\n      return fetchWithExponentialBackoff(url, options, retries - 1, delay * 2);\n    }\n    return response;\n  } catch (error) {\n    if (retries > 0) {\n      await new Promise(res => setTimeout(res, delay));\n      return fetchWithExponentialBackoff(url, options, retries - 1, delay * 2);\n    }\n    throw error;\n  }\n}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {portalTab === "security" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
                      🔑 Security Best Practices & Key Rotation Guard
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Protect client secrets, enforce TLS policies, and configure automated secrets rotative pipelines.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/80 flex flex-col gap-3">
                      <h4 className="font-bold text-slate-800">1. Client Secret Hygiene</h4>
                      <p>
                        Never hardcode secrets inside developer code. Leverage environment variables like standard <code>process.env</code> or secure vaulting software (such as Google Cloud Secrets Manager, HashiCorp Vault, AWS Secrets Manager).
                      </p>
                      <h4 className="font-bold text-slate-800 mt-2">2. TLS Enforce Guidelines</h4>
                      <p>
                        Configure servers to strictly enforce TLS 1.3 encryption. Reject any plaintext request parameters on sight and avoid mixing HTTP/HTTPS pipelines.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/80 flex flex-col gap-3">
                      <h4 className="font-bold text-slate-800">3. Automated Token Rotation Scheduler</h4>
                      <p>
                        Set up cron utilities to rotatively decommission unused client keys or credentials.
                      </p>
                      <div className="bg-slate-900 text-amber-200 p-4 rounded-xl font-mono text-[10px] leading-normal mt-1">
                        {`# Trigger security rotation webhook bi-weekly\n0 4 * * 0 cURL -X POST https://api.${projectData.projectName.toLowerCase()}.com/v1/admin/secrets/rotate \\\n  -H "Authorization: Bearer ADMIN_TOKEN"`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {portalTab === "versions" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
                      📂 Real-time API Specs Versioning Revisions
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Log snapshots of active configuration modules, trace changelogs, and download previous specifications instantly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Add version controls */}
                    <div className="md:col-span-5 bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col gap-4 text-xs text-slate-600">
                      <h4 className="font-bold text-slate-800 bg-slate-100 p-2 rounded text-center mb-1">Create Specification Snapshot</h4>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Version Tag Name</label>
                        <input
                          type="text"
                          value={newVersionTag}
                          onChange={(e) => setNewVersionTag(e.target.value)}
                          className="mt-1 block w-full rounded border-slate-200 bg-white p-2 text-xs focus:outline-none focus:border-indigo-500"
                          placeholder="e.g. v1.1.0"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Revision Changelog</label>
                        <textarea
                          rows={3}
                          value={newVersionChangelog}
                          onChange={(e) => setNewVersionChangelog(e.target.value)}
                          className="mt-1 block w-full rounded border-slate-200 bg-white p-2 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                          placeholder="e.g. Added secure webhooks structure"
                        />
                      </div>

                      <button
                        onClick={handleCreateVersion}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer rounded-lg text-xs tracking-wider transition-colors"
                      >
                        Capture Spec Snapshot
                      </button>
                    </div>

                    {/* Version lists */}
                    <div className="md:col-span-7 flex flex-col gap-3">
                      <h4 className="font-bold text-slate-800 text-sm">Historical API Specifications Version Directory</h4>

                      <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto">
                        {versions.map((ver, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-2 hover:border-slate-300 transition-colors shadow-xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 flex-wrap gap-2">
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold font-mono">
                                {ver.version}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">Captured: {ver.date}</span>
                            </div>
                            <p className="text-xs text-slate-600">{ver.changelog}</p>

                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => {
                                  setProjectData(ver.projectMetadata);
                                  if (ver.generatedMarkdown) {
                                    setGeneratedMarkdown(ver.generatedMarkdown);
                                  }
                                }}
                                className="px-2.5 py-1 bg-slate-100 font-semibold hover:bg-slate-200 text-slate-600 rounded text-[10px] flex items-center gap-1 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3 text-slate-400" /> Restore Spec Config
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
