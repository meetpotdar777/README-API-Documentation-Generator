# 🌍 README & API Documentation Generator
> **A fully integrated technical writer assistant and developer portal playground.**  
> Crafted with ❤️ by **Meet Potdar**.

---

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/Frontend-React_19-61dafb.svg?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Build_System-Vite-646cff.svg?logo=vite)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Backend-Express.js-000000.svg?logo=express)](https://expressjs.com)
[![Google Gemini](https://img.shields.io/badge/AI_Engine-Gemini_API-8e44ad.svg?logo=google-gemini)](https://ai.google.dev/)

**README & API Documentation Generator** is an interactive, full-stack developer portal that allows API architects, engineers, and product managers to easily prototype, design, document, and test interactive APIs. It pairs high-speed UI builders with Gemini-powered generative technical writing, live API mocking, request-response execution, and sandbox validation.

---

## 🚀 Key Features

### 📡 Developer-First Multi-Language API Explorer
* Includes code request snippets for standard environments: **cURL**, **TypeScript**, and **Python**.
* Extended language support for **PHP** and **Java** snippets to maximize developer accessibility and compliance with legacy integrations.

### 🛠️ Enhanced Endpoint Specification Designer
* Customize HTTP path routes, descriptions, methods (e.g., `GET`, `POST`, `PUT`, `DELETE`), and mock data payloads.
* **Custom Headers Specification Builder**: Bind custom headers (like `X-API-Key` or `Custom-Version-Header`) directly onto specific endpoint schemas.
* **Header Sandbox Support**: All custom headers are dynamically reflected into the interactive mock sandbox simulation and output documents.

### 🔑 OAuth2 Permission Scopes Management
* Fully customizable security permission bindings (such as `read:profile` or `write:data`).
* Dynamically syncs scopes across matching endpoints, authorization token setups, code generators, and standard Markdown outputs.

### 💾 Local State Portability (Import & Export Config)
* **Configuration Export**: Export your entire API catalog, endpoint definitions, security settings, and project metadata as a single, portable JSON file.
* **Configuration Import**: Restore your project state instantly into the portal to resume editing, testing, or generating documentation with zero friction.

### 🤖 Gemini Generative AI Technical Writer
* Leverages server-side Gemini integration to automatically synthesize high-quality README content, folder architectures, setup guides, and standard schema tables with zero-placeholder fidelity.

---

## 🛠️ Project Structure

```bash
├── LICENSE                  # MIT License showing author credit (Meet Potdar)
├── README.md                # This project guide showing documentation and features
├── package.json             # NPM package scripts and framework dependencies
├── server.ts                # Express backend proxy routing AI & mock endpoints
├── vite.config.ts           # Bundler config hosting React and Express
├── src/
│   ├── App.tsx              # Main frontend view containing sandbox, builder, metrics
│   ├── data.ts              # Preset initial configurations (SaaS Payment catalog, Task manager)
│   ├── types.ts             # TypeScript interface and metadata bindings
│   └── components/
│       ├── BrandLogo.tsx    # Responsive rendering SVG assets
│       └── MarkdownView.tsx # Render engine for output technical markups
```

---

## ⚙️ How to Setup & Run

### 1. Configure the Environment
Initialize required secrets in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Install Project Dependencies
Use NPM to fetch core libraries:
```bash
npm install
```

### 3. Run Development Server
Spin up the local hot-refreshing environment:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

### 4. Build for Production
Bundle React assets, compile TypeScript, and prepare the standalone server distribution:
```bash
npm run build
```

---

## 📄 License & Attribution

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

Developed, customized, and polished with high precision by **Meet Potdar** © 2026. All rights reserved.
