# KipuView 🚀

KipuView is a premium, high-performance, cross-platform delimited text parser and grid viewer. Built as a desktop app with **Tauri v2** and **Angular**, it operates as a native standalone application for macOS, Windows, and Linux, and compiles smoothly to run directly in modern web browsers.


## 💖 Support & Donations

KipuView is completely free and open-source under the **MIT License**. If this tool saves you time, prevents browser freezes, or helps your workflow, please consider supporting its ongoing development! 

Your donations help pay for Apple/Windows developer certificates to keep the desktop apps signed and secure.

| Platform | Link |
| :--- | :--- |
| **GitHub Sponsors** | [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/YOUR_GITHUB_USERNAME) |
| **Ko-fi** | [![Ko-fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/YOUR_KOFI_USERNAME) |
| **Buy Me A Coffee** | [![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/YOUR_USERNAME) |

---

## Key Features

* **Multi-Tab Workspace**: Open and manage multiple files concurrently in a clean, sandboxed tab bar.
* **Tauri Native Drag & Drop**: Smoothly drag and drop large files directly into the window from your OS file manager (optimized with zone synchronization).
* **High Performance Parsing**: High-speed, line-by-line index scanning for large CSV/TSV/TXT payloads, eliminating browser main-thread freezes.
* **Premium Custom Forms**: Dynamic dropdown selections (`app-select`) and text inputs (`app-input`) featuring hardware-accelerated material outline floating labels.
* **Custom Tooltip System**: Elegant, glassmorphic tooltips appended to `document.body` that allow hover-keep-alive text selection and copying.
* **Dual Theme Engine**: Seamless toggle between a premium slate-grey dark mode and clean light mode.
* **Pre-Load Configuration**: Pre-set your desired separators before loading any files.

---

## 🛠️ Prerequisites

Before getting started, make sure you have the following installed on your system:

1. **Node.js** (v22+) or **Bun** (Recommended)
2. **Rust & Cargo** (Required for Tauri desktop compilation)
   * Follow the [Tauri Prerequisites Guide](https://v2.tauri.app/start/prerequisites/) for your OS (macOS/Windows/Linux toolchains).

---

## 💻 Local Development

### 1. Web Version (Run in Browser/Navigator)

To run the application inside a local web browser environment:

```bash
# Install dependencies
bun install   # or npm install

# Start the Angular development server
bun run start # or npm run start
```
Once started, open your web browser and navigate to **`http://localhost:4221/`**. 

> [!NOTE]
> When running directly in the browser, native Tauri integrations (such as native file dialogs and OS drag events) are mocked/disabled. Use the web filepicker to open files.

### 2. Desktop Version (Tauri Desktop App)

To launch the native desktop application window:

```bash
# Start Tauri dev pipeline (launches the local dev server + native wrapper)
bunx tauri dev # or npx tauri dev
```

---

## 📦 Building for Production

### Compile Desktop App (macOS, Windows, Linux)

To compile the production-ready standalone executable for your current OS:

```bash
# Build the production bundle
bunx tauri build # or npx tauri build
```
This generates:
* **macOS**: `.app` and `.dmg` installers
* **Windows**: `.msi` and `.exe` installers
* **Linux**: `.deb` and `.AppImage` packages

### Compile Web App (for hosting/static servers)

To build the static web assets to host KipuView on a server or CDN:

```bash
# Compile client-side SPA
bun run build # or npm run build
```
Output files will be generated in the `dist/kipu-view/browser` directory.

---

## 🧪 Testing

To run unit tests utilizing Vitest:

```bash
bun run test # or npm run test
```
