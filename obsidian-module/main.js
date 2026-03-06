var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// obsidian-module/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ArxivStudioObsidianPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var VIEW_TYPE_ARXIV = "arxiv-studio-app-view";
var LOCAL_STORAGE_PROJECTS_KEY = "arxiv-studio-projects";
var VAULT_MIRROR_FILENAME = "projects.json";
var OFFICIAL_WEBAPP_URL = "https://infinition.github.io/arxiv-studio/";
var LEGACY_LOCALHOST_URL = "http://localhost:5173";
var DEFAULT_SETTINGS = {
  runtime: "embedded",
  remoteUrl: OFFICIAL_WEBAPP_URL,
  autoDownloadMissingWebapp: true,
  webappBootstrapUrl: OFFICIAL_WEBAPP_URL,
  provider: "local",
  providerVaultPath: "vaults/arxiv",
  providerToken: "",
  providerRef: "main",
  enableVaultMirror: false,
  vaultMirrorFolder: "arxiv-studio",
  saveImagesAsLinks: false
};
var ArxivStudioObsidianPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings", DEFAULT_SETTINGS);
    __publicField(this, "liveViews", /* @__PURE__ */ new Set());
    __publicField(this, "embeddedWebappBootstrapPromise", null);
  }
  async onload() {
    await this.loadSettings();
    void this.ensureEmbeddedWebappAvailable();
    this.registerView(VIEW_TYPE_ARXIV, (leaf) => new ArxivStudioAppView(leaf, this));
    this.addSettingTab(new ArxivStudioSettingsTab(this.app, this));
    this.addRibbonIcon("layers", "Open ArXiv Studio", () => {
      this.activateView();
    });
    this.addCommand({
      id: "arxiv-open-app-view",
      name: "Open ArXiv Studio view",
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "arxiv-send-active-markdown",
      name: "Send active markdown to ArXiv Studio",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!(file instanceof import_obsidian.TFile) || file.extension !== "md") return false;
        if (!checking) this.sendActiveMarkdown().catch((e) => new import_obsidian.Notice(`ArXiv Studio: ${String(e)}`));
        return true;
      }
    });
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_ARXIV);
    this.liveViews.clear();
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_ARXIV);
    if (leaves.length > 0) leaf = leaves[0];
    else leaf = workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: VIEW_TYPE_ARXIV, active: true });
    workspace.revealLeaf(leaf);
  }
  async sendActiveMarkdown() {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof import_obsidian.TFile) || file.extension !== "md") return;
    const text = await this.app.vault.read(file);
    this.broadcastDrop({
      kind: "markdown",
      text,
      sourcePath: file.path
    });
    new import_obsidian.Notice(`ArXiv Studio: sent ${file.basename}`);
  }
  broadcastDrop(payload) {
    for (const view of this.liveViews) view.postDrop(payload);
  }
  async resolveEmbeddedIndexUrl() {
    const adapter = this.app.vault.adapter;
    if (typeof adapter.getResourcePath !== "function") return null;
    const configDir = this.app.vault.configDir;
    const pluginRoot = (0, import_obsidian.normalizePath)(`${configDir}/plugins`);
    const id = this.manifest.id;
    const dir = this.manifest.dir;
    const candidates = /* @__PURE__ */ new Set();
    candidates.add(id);
    if (dir) candidates.add(dir.split("/").pop() || dir);
    for (const folder of candidates) {
      const embedded = (0, import_obsidian.normalizePath)(`${pluginRoot}/${folder}/webapp/embedded.html`);
      if (await this.app.vault.adapter.exists(embedded)) {
        return adapter.getResourcePath(embedded);
      }
      const index = (0, import_obsidian.normalizePath)(`${pluginRoot}/${folder}/webapp/index.html`);
      if (await this.app.vault.adapter.exists(index)) {
        return adapter.getResourcePath(index);
      }
    }
    return null;
  }
  async resolveEmbeddedHtmlUrl() {
    const adapter = this.app.vault.adapter;
    if (typeof adapter.getResourcePath !== "function") return null;
    const configDir = this.app.vault.configDir;
    const pluginRoot = (0, import_obsidian.normalizePath)(`${configDir}/plugins`);
    const id = this.manifest.id;
    const dir = this.manifest.dir;
    const candidates = /* @__PURE__ */ new Set();
    candidates.add(id);
    if (dir) candidates.add(dir.split("/").pop() || dir);
    for (const folder of candidates) {
      const embedded = (0, import_obsidian.normalizePath)(`${pluginRoot}/${folder}/webapp/embedded.html`);
      if (await this.app.vault.adapter.exists(embedded)) {
        return adapter.getResourcePath(embedded);
      }
    }
    return null;
  }
  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    if (!this.settings.webappBootstrapUrl.trim()) {
      this.settings.webappBootstrapUrl = OFFICIAL_WEBAPP_URL;
    }
    if (!loaded?.remoteUrl) {
      this.settings.remoteUrl = OFFICIAL_WEBAPP_URL;
    }
    if (loaded?.runtime !== "remote" && this.settings.remoteUrl.trim() === LEGACY_LOCALHOST_URL && !loaded?.webappBootstrapUrl) {
      this.settings.remoteUrl = OFFICIAL_WEBAPP_URL;
    }
    if (this.settings.remoteUrl.trim() === LEGACY_LOCALHOST_URL && !loaded?.webappBootstrapUrl) {
      this.settings.webappBootstrapUrl = OFFICIAL_WEBAPP_URL;
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
    for (const view of this.liveViews) view.onPluginSettingsChanged();
  }
  async ensureEmbeddedWebappAvailable(showSuccessNotice = false) {
    if (this.settings.runtime !== "embedded") return false;
    const embedded = await this.resolveEmbeddedHtmlUrl();
    if (embedded) return true;
    const existingIndex = await this.resolveEmbeddedIndexUrl();
    if (!this.settings.autoDownloadMissingWebapp) return Boolean(existingIndex);
    if (this.embeddedWebappBootstrapPromise) return this.embeddedWebappBootstrapPromise;
    this.embeddedWebappBootstrapPromise = this.bootstrapEmbeddedWebappFromRemote(showSuccessNotice).finally(() => {
      this.embeddedWebappBootstrapPromise = null;
    });
    return this.embeddedWebappBootstrapPromise;
  }
  async bootstrapEmbeddedWebappFromRemote(showSuccessNotice = false) {
    const explicitBootstrap = (this.settings.webappBootstrapUrl || "").trim();
    const remoteFallback = (this.settings.remoteUrl || "").trim();
    const candidates = [explicitBootstrap, remoteFallback].filter(Boolean);
    for (const base of candidates) {
      if (!/^https?:\/\//i.test(base)) continue;
      if (!explicitBootstrap && isLocalhostHttpUrl(base)) continue;
      try {
        const downloaded = await downloadWebappTreeToPluginFolder(this.app, this.manifest, base);
        if (downloaded) {
          if (showSuccessNotice) new import_obsidian.Notice("ArXiv Studio: embedded webapp downloaded from remote source.");
          return true;
        }
      } catch (e) {
        if (showSuccessNotice) {
          new import_obsidian.Notice(`ArXiv Studio: webapp bootstrap failed (${String(e)})`);
        }
      }
    }
    return false;
  }
};
var ArxivStudioAppView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    __publicField(this, "plugin");
    __publicField(this, "iframe", null);
    __publicField(this, "frameReady", false);
    __publicField(this, "queued", []);
    __publicField(this, "themeObserver", null);
    __publicField(this, "themeSyncTimer", null);
    __publicField(this, "mirrorSyncTimer", null);
    __publicField(this, "mirrorLastPayload", "");
    __publicField(this, "hydratingFromVault", false);
    __publicField(this, "mirrorPathNotified", false);
    __publicField(this, "frameMessageHandler", null);
    __publicField(this, "frameProjectsRaw", null);
    __publicField(this, "frameProjectsWaiters", []);
    __publicField(this, "providerLastPayload", "");
    __publicField(this, "providerNoticeShown", false);
    __publicField(this, "webappBootstrapPromise", null);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_ARXIV;
  }
  getDisplayText() {
    return "ArXiv Studio";
  }
  getIcon() {
    return "layers";
  }
  async onOpen() {
    this.plugin.liveViews.add(this);
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("arxiv-studio-view");
    root.style.height = "100%";
    root.style.minHeight = "0";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    this.iframe = root.createEl("iframe");
    this.iframe.addClass("arxiv-studio-iframe");
    this.iframe.style.width = "100%";
    this.iframe.style.height = "100%";
    this.iframe.style.minHeight = "0";
    this.iframe.style.flex = "1 1 auto";
    this.iframe.style.border = "1px solid var(--background-modifier-border)";
    this.iframe.style.borderRadius = "10px";
    this.iframe.sandbox.add("allow-scripts");
    this.iframe.sandbox.add("allow-same-origin");
    this.iframe.sandbox.add("allow-downloads");
    this.iframe.sandbox.add("allow-forms");
    this.iframe.sandbox.add("allow-modals");
    this.iframe.referrerPolicy = "no-referrer";
    this.iframe.addEventListener("load", () => {
      this.handleFrameLoaded().catch((e) => new import_obsidian.Notice(`ArXiv Studio: ${String(e)}`));
    });
    this.startThemeSync();
    this.startFrameBridge();
    this.bindDropBridge(root);
    this.reloadFrame().catch((e) => new import_obsidian.Notice(`ArXiv Studio: ${String(e)}`));
  }
  async onClose() {
    this.plugin.liveViews.delete(this);
    this.frameReady = false;
    this.queued = [];
    this.stopThemeSync();
    this.stopVaultMirrorSync();
    this.stopFrameBridge();
  }
  async reloadFrame() {
    if (!this.iframe) return;
    this.frameReady = false;
    this.stopVaultMirrorSync();
    let src = null;
    if (this.plugin.settings.runtime === "embedded") {
      src = await this.plugin.resolveEmbeddedIndexUrl();
      if (!src && this.plugin.settings.autoDownloadMissingWebapp) {
        const bootstrapped = await this.ensureEmbeddedWebappFromRemote();
        if (bootstrapped) {
          src = await this.plugin.resolveEmbeddedIndexUrl();
        }
      }
      if (!src) {
        const fallback = this.plugin.settings.remoteUrl?.trim();
        if (fallback) {
          src = fallback;
          this.setStatus("Embedded app not found. Using Remote URL fallback.");
        } else {
          this.setStatus("Embedded app not found. Run `npm run build:obsidian` and copy webapp/.");
          new import_obsidian.Notice("ArXiv Studio: embedded build not found.");
          return;
        }
      } else {
        this.setStatus("Embedded app loaded.");
      }
    } else {
      src = this.plugin.settings.remoteUrl?.trim() || null;
      if (!src) {
        this.setStatus("Remote URL empty.");
        new import_obsidian.Notice("ArXiv Studio: remote URL is empty.");
        return;
      }
      this.setStatus("Remote app loaded.");
    }
    this.iframe.src = src;
  }
  async ensureEmbeddedWebappFromRemote() {
    return this.plugin.ensureEmbeddedWebappAvailable(true);
  }
  async handleFrameLoaded() {
    const hydrated = await this.hydrateFrameFromVaultIfNeeded();
    if (hydrated) return;
    this.frameReady = true;
    this.applyObsidianThemeToIframe();
    this.flushQueue();
    this.startVaultMirrorSync();
  }
  postDrop(payload) {
    if (!this.iframe?.contentWindow) return;
    if (!this.frameReady) {
      this.queued.push(payload);
      return;
    }
    this.postToFrame("arxiv.obsidian.drop", payload);
  }
  flushQueue() {
    if (!this.frameReady || !this.queued.length) return;
    const q = [...this.queued];
    this.queued = [];
    for (const payload of q) this.postDrop(payload);
  }
  setStatus(msg) {
    void msg;
  }
  postToFrame(type, payload) {
    if (!this.iframe?.contentWindow) return;
    this.iframe.contentWindow.postMessage({ type, payload }, "*");
  }
  startFrameBridge() {
    this.stopFrameBridge();
    this.frameMessageHandler = (event) => {
      if (!this.iframe?.contentWindow) return;
      const data = event.data;
      const fromFrame = event.source === this.iframe.contentWindow;
      const type = typeof data?.type === "string" ? data.type : "";
      if (!fromFrame && !type.startsWith("arxiv.obsidian.")) return;
      if (!data || !data.type) return;
      if (data.type === "arxiv.obsidian.resolve-uri") {
        const payload = data.payload;
        if (!payload?.uri) return;
        this.resolveAndSendObsidianUri(payload.uri, {
          x: payload.x,
          y: payload.y,
          pageId: payload.pageId
        }).catch(() => void 0);
        return;
      }
      if (data.type === "arxiv.obsidian.projects.response") {
        const payload = data.payload;
        const raw = typeof payload?.raw === "string" ? payload.raw : null;
        this.frameProjectsRaw = raw;
        const waiters = [...this.frameProjectsWaiters];
        this.frameProjectsWaiters = [];
        for (const resolve of waiters) resolve(raw);
        return;
      }
      if (data.type === "arxiv.obsidian.toggle-fullscreen") {
        this.togglePaneFullscreen();
        return;
      }
      if (data.type === "arxiv.obsidian.print") {
        this.printEmbeddedApp();
      }
    };
    window.addEventListener("message", this.frameMessageHandler);
  }
  stopFrameBridge() {
    if (this.frameMessageHandler) {
      window.removeEventListener("message", this.frameMessageHandler);
      this.frameMessageHandler = null;
    }
    if (this.frameProjectsWaiters.length) {
      const waiters = [...this.frameProjectsWaiters];
      this.frameProjectsWaiters = [];
      for (const resolve of waiters) resolve(null);
    }
  }
  normalizeDroppedReference(rawReference) {
    let raw = rawReference.trim();
    if (!raw) return null;
    const embeddedUri = extractObsidianOpenUri(raw);
    if (embeddedUri) raw = embeddedUri;
    const normalizeCandidate = (value) => {
      const trimmed = value.trim();
      if (!trimmed) return null;
      let decoded = trimmed;
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
      }
      const noLead = decoded.replace(/^\/+/, "");
      return (0, import_obsidian.normalizePath)(noLead);
    };
    if (raw.toLowerCase().startsWith("obsidian://open?")) {
      try {
        const url = new URL(raw);
        const encodedPath = url.searchParams.get("file") || url.searchParams.get("path");
        if (!encodedPath) return null;
        return normalizeCandidate(encodedPath);
      } catch {
        return null;
      }
    }
    if (raw.toLowerCase().startsWith("file://")) {
      try {
        const url = new URL(raw);
        const absPath = (0, import_obsidian.normalizePath)(decodeURIComponent(url.pathname).replace(/^\/(?=[a-zA-Z]:\/)/, ""));
        const rel = this.toVaultRelativePath(absPath);
        if (rel) return rel;
      } catch {
      }
    }
    if (raw.toLowerCase().startsWith("app://")) {
      try {
        const url = new URL(raw);
        const byParam = url.searchParams.get("file");
        if (byParam) {
          const rel2 = normalizeCandidate(byParam);
          if (rel2) return rel2;
        }
        const path = decodeURIComponent(url.pathname || "");
        const rel = this.toVaultRelativePath((0, import_obsidian.normalizePath)(path.replace(/^\/(?=[a-zA-Z]:\/)/, "")));
        if (rel) return rel;
      } catch {
      }
    }
    const normalized = normalizeCandidate(raw);
    if (!normalized) return null;
    if (/^[a-zA-Z]:[\\/]/.test(normalized) || normalized.startsWith("\\\\")) {
      const rel = this.toVaultRelativePath((0, import_obsidian.normalizePath)(normalized.replace(/\\/g, "/")));
      if (rel) return rel;
    }
    return normalized;
  }
  toVaultRelativePath(absPath) {
    if (!absPath) return null;
    const adapter = this.app.vault.adapter;
    if (typeof adapter.getBasePath !== "function") return null;
    const base = (0, import_obsidian.normalizePath)(adapter.getBasePath());
    if (!base) return null;
    if (absPath === base) return "";
    const prefix = `${base}/`;
    if (!absPath.startsWith(prefix)) return null;
    return (0, import_obsidian.normalizePath)(absPath.slice(prefix.length));
  }
  async resolveAndSendObsidianUri(reference, extra) {
    const path = this.normalizeDroppedReference(reference);
    if (!path) return false;
    const af = this.app.vault.getAbstractFileByPath(path);
    if (!(af instanceof import_obsidian.TFile)) return false;
    if (af.extension.toLowerCase() === "md") {
      const text = await this.app.vault.read(af);
      const html = await this.renderMarkdownHtml(text, af.path);
      this.postDrop({ kind: "markdown", text, html, sourcePath: af.path, ...extra });
      return true;
    }
    if (/\b(png|jpe?g|gif|webp|svg)\b/i.test(af.extension)) {
      const bin = await this.app.vault.readBinary(af);
      const mime = mimeByExt(af.extension);
      const dataUrl = `data:${mime};base64,${arrayBufferToBase64(bin)}`;
      this.postDrop({ kind: "image", dataUrl, sourcePath: af.path, ...extra });
      return true;
    }
    return false;
  }
  async renderMarkdownHtml(markdown, sourcePath) {
    const host = document.createElement("div");
    try {
      await import_obsidian.MarkdownRenderer.render(this.app, markdown, host, sourcePath, this);
      return host.innerHTML || "";
    } catch {
      return "";
    }
  }
  onPluginSettingsChanged() {
    this.stopVaultMirrorSync();
    this.providerLastPayload = "";
    this.providerNoticeShown = false;
    this.startVaultMirrorSync();
  }
  startVaultMirrorSync() {
    this.stopVaultMirrorSync();
    if (!this.plugin.settings.enableVaultMirror) return;
    const imageMode = this.plugin.settings.saveImagesAsLinks ? "images=links" : "images=embedded";
    this.setStatus(`Vault mirror: ${this.getVaultMirrorFilePath()} (${imageMode})`);
    (async () => {
      try {
        const hydrated = await this.hydrateFrameFromVaultIfNeeded();
        if (hydrated) return;
        await this.syncVaultMirrorFromFrame();
        this.mirrorSyncTimer = window.setInterval(() => {
          this.syncVaultMirrorFromFrame().catch((e) => {
            this.setStatus(`Vault mirror write failed: ${String(e)}`);
          });
        }, 1500);
      } catch (e) {
        this.setStatus(`Vault mirror write failed: ${String(e)}`);
        new import_obsidian.Notice(`ArXiv Studio: vault mirror write failed (${String(e)})`);
      }
    })();
  }
  stopVaultMirrorSync() {
    if (this.mirrorSyncTimer !== null) {
      window.clearInterval(this.mirrorSyncTimer);
      this.mirrorSyncTimer = null;
    }
  }
  async hydrateFrameFromVaultIfNeeded() {
    if (!this.plugin.settings.enableVaultMirror || !this.iframe?.contentWindow) return false;
    if (this.hydratingFromVault) {
      this.hydratingFromVault = false;
      return false;
    }
    let currentRaw = "";
    try {
      currentRaw = this.iframe.contentWindow.localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY) || "";
    } catch {
      return false;
    }
    const hasLocalProjects = (() => {
      const trimmed = currentRaw.trim();
      if (!trimmed) return false;
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.length > 0 : true;
      } catch {
        return true;
      }
    })();
    if (hasLocalProjects) {
      this.mirrorLastPayload = currentRaw;
      return false;
    }
    const adapter = this.app.vault.adapter;
    const mirrorPath = this.getVaultMirrorFilePath();
    if (!await adapter.exists(mirrorPath)) return false;
    let raw = "";
    try {
      raw = await adapter.read(mirrorPath);
    } catch {
      return false;
    }
    if (!raw.trim()) return false;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return false;
    } catch {
      return false;
    }
    let runtimeRaw = raw;
    if (this.plugin.settings.saveImagesAsLinks) {
      runtimeRaw = await this.inflateMirrorImageLinks(raw);
    }
    try {
      this.iframe.contentWindow.localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, runtimeRaw);
      this.mirrorLastPayload = raw;
      this.hydratingFromVault = true;
      this.iframe.contentWindow.location.reload();
      return true;
    } catch {
      return false;
    }
  }
  async syncVaultMirrorFromFrame() {
    if (!this.plugin.settings.enableVaultMirror || !this.iframe?.contentWindow) return;
    let raw = await this.readProjectsRawFromFrame();
    if (raw == null) return;
    if (!raw.trim()) raw = "[]";
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
    } catch {
      return;
    }
    let mirrorRaw = raw;
    if (this.plugin.settings.saveImagesAsLinks) {
      mirrorRaw = await this.deflateImagesToMirrorLinks(raw);
    }
    if (mirrorRaw !== this.mirrorLastPayload) {
      await ensureVaultFolderExists(this.app, this.getVaultMirrorFolderPath());
      await this.app.vault.adapter.write(this.getVaultMirrorFilePath(), mirrorRaw);
      this.mirrorLastPayload = mirrorRaw;
      if (!this.mirrorPathNotified) {
        this.mirrorPathNotified = true;
        new import_obsidian.Notice(`ArXiv Studio: projects mirrored to ${this.getVaultMirrorFilePath()}`);
      }
    }
    await this.syncProviderMirror(mirrorRaw);
  }
  async syncProviderMirror(raw) {
    const provider = this.plugin.settings.provider;
    if (!provider || provider === "local") return;
    if (!this.plugin.settings.enableVaultMirror) return;
    if (raw === this.providerLastPayload) return;
    if (!this.plugin.settings.providerVaultPath.trim()) {
      this.setStatus("Provider sync skipped: empty provider path");
      return;
    }
    if (provider !== "icloud-drive" && !this.plugin.settings.providerToken.trim()) {
      this.setStatus(`Provider sync skipped: token missing for ${provider}`);
      return;
    }
    try {
      if (provider === "onedrive") {
        await this.syncOneDrive(raw);
      } else if (provider === "github") {
        await this.syncGitHub(raw);
      } else if (provider === "icloud-drive") {
        await this.syncICloudLocal(raw);
      } else {
        this.setStatus(`Provider ${provider} configured but not implemented yet`);
        return;
      }
      this.providerLastPayload = raw;
      if (!this.providerNoticeShown) {
        this.providerNoticeShown = true;
        new import_obsidian.Notice(`ArXiv Studio: provider mirror synced (${provider})`);
      }
    } catch (e) {
      this.setStatus(`Provider sync failed (${provider}): ${String(e)}`);
    }
  }
  async syncOneDrive(raw) {
    const token = this.plugin.settings.providerToken.trim();
    const folder = this.plugin.settings.providerVaultPath.trim().replace(/^\/+|\/+$/g, "");
    const filePath = folder ? `${folder}/${VAULT_MIRROR_FILENAME}` : VAULT_MIRROR_FILENAME;
    const encodedPath = filePath.split("/").filter(Boolean).map((p) => encodeURIComponent(p)).join("/");
    const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedPath}:/content`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: raw
    });
    if (!res.ok) {
      const txt = await safeResponseText(res);
      throw new Error(`OneDrive HTTP ${res.status}: ${txt}`);
    }
  }
  async syncGitHub(raw) {
    const token = this.plugin.settings.providerToken.trim();
    const ref = this.plugin.settings.providerRef.trim() || "main";
    const parsed = parseGitHubTarget(this.plugin.settings.providerVaultPath);
    if (!parsed) throw new Error("GitHub path must be owner/repo[/folder]");
    const { owner, repo, folder } = parsed;
    const filePath = [folder, VAULT_MIRROR_FILENAME].filter(Boolean).join("/");
    const apiPath = filePath.split("/").filter(Boolean).map((p) => encodeURIComponent(p)).join("/");
    let sha;
    const getUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${apiPath}?ref=${encodeURIComponent(ref)}`;
    const getRes = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    });
    if (getRes.status === 200) {
      const data = await getRes.json();
      sha = data.sha;
    } else if (getRes.status !== 404) {
      const txt = await safeResponseText(getRes);
      throw new Error(`GitHub read HTTP ${getRes.status}: ${txt}`);
    }
    const putUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${apiPath}`;
    const payload = {
      message: "chore(arxiv-studio): sync projects.json",
      content: utf8ToBase64(raw),
      branch: ref
    };
    if (sha) payload.sha = sha;
    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!putRes.ok) {
      const txt = await safeResponseText(putRes);
      throw new Error(`GitHub write HTTP ${putRes.status}: ${txt}`);
    }
  }
  async syncICloudLocal(raw) {
    const rawPath = this.plugin.settings.providerVaultPath.trim();
    if (!rawPath) throw new Error("iCloud local path is empty");
    const filePath = normalizeFsPath(rawPath.replace(/[\\\/]+$/, "")) + "\\" + VAULT_MIRROR_FILENAME;
    const req = window.require;
    if (!req) throw new Error("Node require is unavailable in this Obsidian runtime");
    const fs = req("fs/promises");
    const pathMod = req("path");
    await fs.mkdir(pathMod.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, raw, "utf8");
  }
  async deflateImagesToMirrorLinks(raw) {
    let projects;
    try {
      projects = JSON.parse(raw);
    } catch {
      return raw;
    }
    if (!Array.isArray(projects)) return raw;
    const adapter = this.app.vault.adapter;
    const baseFolder = (0, import_obsidian.normalizePath)(`${this.getVaultMirrorFolderPath()}/images`);
    await ensureVaultFolderExists(this.app, baseFolder);
    const cache = /* @__PURE__ */ new Map();
    const toLink = async (projectId, value) => {
      if (!value.startsWith("data:image/")) return value;
      if (cache.has(value)) return cache.get(value);
      const parsed = parseImageDataUrl(value);
      if (!parsed) return value;
      const hash = shortHash(value);
      const ext = extFromMime(parsed.mime);
      const filePath = (0, import_obsidian.normalizePath)(`${baseFolder}/${projectId}/${hash}.${ext}`);
      await ensureVaultFolderExists(this.app, dirnamePosix(filePath));
      if (!await adapter.exists(filePath)) {
        await adapter.writeBinary(filePath, parsed.buffer);
      }
      const link = `vault-image://${filePath}`;
      cache.set(value, link);
      return link;
    };
    for (const project of projects) {
      const projectId = typeof project.id === "string" && project.id ? project.id : "project";
      const assets = Array.isArray(project.assets) ? project.assets : [];
      for (const asset of assets) {
        if (typeof asset.dataUrl === "string") asset.dataUrl = await toLink(projectId, asset.dataUrl);
      }
      const mapImageElements = async (list) => {
        if (!Array.isArray(list)) return;
        for (const el of list) {
          if (el.type === "image" && typeof el.content === "string") {
            el.content = await toLink(projectId, el.content);
          }
        }
      };
      await mapImageElements(project.headerElements);
      await mapImageElements(project.footerElements);
      const pages = Array.isArray(project.pages) ? project.pages : [];
      for (const page of pages) {
        await mapImageElements(page.elements);
        if (typeof page.paperTexture === "string") page.paperTexture = await toLink(projectId, page.paperTexture);
      }
      const settings = project.settings;
      if (settings && typeof settings.paperTextureGlobal === "string") {
        settings.paperTextureGlobal = await toLink(projectId, settings.paperTextureGlobal);
      }
    }
    return JSON.stringify(projects);
  }
  async inflateMirrorImageLinks(raw) {
    let projects;
    try {
      projects = JSON.parse(raw);
    } catch {
      return raw;
    }
    if (!Array.isArray(projects)) return raw;
    const adapter = this.app.vault.adapter;
    const cache = /* @__PURE__ */ new Map();
    const toDataUrl = async (value) => {
      if (!value.startsWith("vault-image://")) return value;
      if (cache.has(value)) return cache.get(value);
      const path = (0, import_obsidian.normalizePath)(value.slice("vault-image://".length));
      try {
        const bin = await adapter.readBinary(path);
        const mime = mimeByExt(path.split(".").pop() || "");
        const dataUrl = `data:${mime};base64,${arrayBufferToBase64(bin)}`;
        cache.set(value, dataUrl);
        return dataUrl;
      } catch {
        return value;
      }
    };
    for (const project of projects) {
      const assets = Array.isArray(project.assets) ? project.assets : [];
      for (const asset of assets) {
        if (typeof asset.dataUrl === "string") asset.dataUrl = await toDataUrl(asset.dataUrl);
      }
      const mapImageElements = async (list) => {
        if (!Array.isArray(list)) return;
        for (const el of list) {
          if (el.type === "image" && typeof el.content === "string") {
            el.content = await toDataUrl(el.content);
          }
        }
      };
      await mapImageElements(project.headerElements);
      await mapImageElements(project.footerElements);
      const pages = Array.isArray(project.pages) ? project.pages : [];
      for (const page of pages) {
        await mapImageElements(page.elements);
        if (typeof page.paperTexture === "string") page.paperTexture = await toDataUrl(page.paperTexture);
      }
      const settings = project.settings;
      if (settings && typeof settings.paperTextureGlobal === "string") {
        settings.paperTextureGlobal = await toDataUrl(settings.paperTextureGlobal);
      }
    }
    return JSON.stringify(projects);
  }
  async readProjectsRawFromFrame() {
    if (!this.iframe?.contentWindow) return null;
    try {
      return this.iframe.contentWindow.localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY) || "[]";
    } catch {
    }
    const response = await this.requestProjectsRawViaPostMessage(1200);
    if (typeof response === "string") return response;
    return this.frameProjectsRaw;
  }
  requestProjectsRawViaPostMessage(timeoutMs) {
    if (!this.iframe?.contentWindow) return Promise.resolve(null);
    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        resolve(value);
      };
      this.frameProjectsWaiters.push(finish);
      this.postToFrame("arxiv.obsidian.projects.request", {});
      window.setTimeout(() => finish(null), timeoutMs);
    });
  }
  getVaultMirrorFolderPath() {
    const raw = (this.plugin.settings.vaultMirrorFolder || "").trim();
    const sanitized = raw.replace(/^\/+|\/+$/g, "");
    return sanitized || DEFAULT_SETTINGS.vaultMirrorFolder;
  }
  getVaultMirrorFilePath() {
    return (0, import_obsidian.normalizePath)(`${this.getVaultMirrorFolderPath()}/${VAULT_MIRROR_FILENAME}`);
  }
  async ensureVaultFolderExists(folderPath) {
    const adapter = this.app.vault.adapter;
    const parts = (0, import_obsidian.normalizePath)(folderPath).split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!await adapter.exists(current)) {
        await adapter.mkdir(current);
      }
    }
  }
  startThemeSync() {
    this.stopThemeSync();
    this.themeObserver = new MutationObserver(() => this.applyObsidianThemeToIframe());
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"]
    });
    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style"]
    });
    this.themeSyncTimer = window.setInterval(() => this.applyObsidianThemeToIframe(), 1200);
  }
  stopThemeSync() {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
    if (this.themeSyncTimer !== null) {
      window.clearInterval(this.themeSyncTimer);
      this.themeSyncTimer = null;
    }
  }
  applyObsidianThemeToIframe() {
    const iframe = this.iframe;
    if (!iframe) return;
    const hostRoot = getComputedStyle(document.documentElement);
    const hostBody = getComputedStyle(document.body);
    const readVar = (...names) => {
      for (const name of names) {
        const a = hostBody.getPropertyValue(name).trim();
        if (a) return a;
        const b = hostRoot.getPropertyValue(name).trim();
        if (b) return b;
      }
      return "";
    };
    const collectCustomProps = (source, target) => {
      for (let i = 0; i < source.length; i += 1) {
        const name = source.item(i);
        if (!name || !name.startsWith("--")) continue;
        const value = source.getPropertyValue(name);
        if (!value || !value.trim()) continue;
        target[name] = value;
      }
    };
    const vars = {};
    collectCustomProps(hostRoot, vars);
    collectCustomProps(hostBody, vars);
    const mappedVars = {
      "--page-bg": readVar("--background-primary"),
      "--canvas-bg": readVar("--background-secondary", "--background-primary-alt"),
      "--panel-bg": readVar("--background-primary"),
      "--panel-border": readVar("--background-modifier-border"),
      "--text-primary": readVar("--text-normal"),
      "--text-secondary": readVar("--text-muted", "--text-faint"),
      "--toolbar-bg": readVar("--background-primary", "--background-secondary"),
      "--hover-bg": readVar("--background-modifier-hover"),
      "--selected-bg": readVar("--interactive-accent-hover", "--background-modifier-hover"),
      "--selected-border": readVar("--interactive-accent"),
      "--floating-bg": readVar("--background-primary"),
      "--floating-text": readVar("--text-normal"),
      "--grid-dot": readVar("--text-faint", "--text-muted"),
      "--ruler-bg": readVar("--background-modifier-border"),
      "--ruler-text": readVar("--text-faint", "--text-muted")
    };
    for (const [key, value] of Object.entries(mappedVars)) {
      if (value) vars[key] = value;
    }
    const isDark = document.body.classList.contains("theme-dark") || document.documentElement.classList.contains("theme-dark");
    let frameDoc = null;
    try {
      frameDoc = iframe.contentDocument;
    } catch {
      frameDoc = null;
    }
    if (frameDoc?.documentElement) {
      const root = frameDoc.documentElement;
      const frameRootStyle = root.style;
      const frameBodyStyle = frameDoc.body?.style;
      for (const [key, value] of Object.entries(vars)) {
        if (value) frameRootStyle.setProperty(key, value);
      }
      if (frameBodyStyle) {
        const bg = readVar("--background-primary", "--background-secondary");
        const fg = readVar("--text-normal");
        const font = readVar("--font-interface");
        if (bg) frameBodyStyle.background = bg;
        if (fg) frameBodyStyle.color = fg;
        if (font) frameBodyStyle.fontFamily = font;
      }
    }
    this.postToFrame("arxiv.obsidian.theme", {
      mode: isDark ? "dark" : "light",
      vars
    });
  }
  togglePaneFullscreen() {
    try {
      const workspace = this.app.workspace;
      workspace.setActiveLeaf?.(this.leaf, true, true);
      const commands = [
        "workspace:toggle-maximize-pane",
        "workspace:toggle-maximize-current-leaf"
      ];
      for (const id of commands) {
        try {
          const executed = this.app.commands.executeCommandById(id);
          if (executed) return;
        } catch {
        }
      }
      throw new Error("No maximize command available");
    } catch (e) {
      new import_obsidian.Notice(`ArXiv Studio: cannot toggle fullscreen (${String(e)})`);
    }
  }
  printEmbeddedApp() {
    try {
      const workspace = this.app.workspace;
      workspace.setActiveLeaf?.(this.leaf, true, true);
    } catch {
    }
    try {
      this.postToFrame("arxiv.obsidian.host-print", {});
      return;
    } catch {
    }
    try {
      this.iframe?.contentWindow?.focus();
      this.iframe?.contentWindow?.print();
      return;
    } catch {
    }
    try {
      this.app.commands.executeCommandById("window:print");
    } catch (e) {
      new import_obsidian.Notice(`ArXiv Studio: cannot print (${String(e)})`);
    }
  }
  bindDropBridge(root) {
    const onDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onDrop = async (e) => {
      e.preventDefault();
      const dt = e.dataTransfer;
      if (!dt) return;
      const handled = await this.handleDataTransferDrop(dt);
      if (!handled) {
        const text = dt.getData("text/plain");
        const trimmed = text?.trim() || "";
        if (!trimmed) return;
        if (looksLikeMarkdownText(trimmed)) {
          const html = await this.renderMarkdownHtml(trimmed, "clipboard.md");
          this.postDrop({ kind: "markdown", text: trimmed, html, sourcePath: "clipboard.md" });
          return;
        }
        this.postDrop({ kind: "text", text: trimmed });
      }
    };
    const targets = [root, this.iframe].filter((v) => Boolean(v));
    for (const target of targets) {
      target.addEventListener("dragover", onDragOver);
      target.addEventListener("drop", onDrop);
    }
    this.register(() => {
      for (const target of targets) {
        target.removeEventListener("dragover", onDragOver);
        target.removeEventListener("drop", onDrop);
      }
    });
  }
  async handleDataTransferDrop(dt) {
    const files = Array.from(dt.files || []);
    if (files.length > 0) {
      let sent = false;
      for (const file of files) {
        const ext = fileExt(file.name);
        if (file.type.startsWith("image/") || isImageExt(ext)) {
          const dataUrl = await readFileAsDataUrl(file);
          this.postDrop({ kind: "image", dataUrl, sourcePath: file.name });
          sent = true;
          continue;
        }
        if (isMarkdownExt(ext)) {
          const text = await readFileAsText(file);
          const html = await this.renderMarkdownHtml(text, file.name);
          this.postDrop({ kind: "markdown", text, html, sourcePath: file.name });
          sent = true;
          continue;
        }
        if (file.type.startsWith("text/")) {
          const text = await readFileAsText(file);
          this.postDrop({ kind: "text", text, sourcePath: file.name });
          sent = true;
        }
      }
      if (sent) return true;
    }
    const candidates = extractDataTransferTextCandidates(dt);
    for (const candidate of candidates) {
      if (await this.resolveAndSendObsidianUri(candidate)) return true;
    }
    return false;
  }
};
var ArxivStudioSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Runtime").setDesc("Embedded = packaged app build inside plugin. Remote = URL.").addDropdown((dd) => dd.addOption("embedded", "Embedded").addOption("remote", "Remote URL").setValue(this.plugin.settings.runtime).onChange(async (value) => {
      this.plugin.settings.runtime = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Remote URL").setDesc("Used when runtime is Remote URL. Default: official GitHub Pages app.").addText((text) => text.setPlaceholder(OFFICIAL_WEBAPP_URL).setValue(this.plugin.settings.remoteUrl).onChange(async (value) => {
      this.plugin.settings.remoteUrl = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Auto-download missing embedded webapp").setDesc("If webapp folder is missing (BRAT style install), try downloading embedded build from URL below or Remote URL.").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoDownloadMissingWebapp).onChange(async (value) => {
      this.plugin.settings.autoDownloadMissingWebapp = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Webapp bootstrap URL").setDesc("Folder URL containing embedded.html/index.html and assets. BRAT installs use this when the packaged webapp folder is missing.").addText((text) => text.setPlaceholder(OFFICIAL_WEBAPP_URL).setValue(this.plugin.settings.webappBootstrapUrl || "").onChange(async (value) => {
      this.plugin.settings.webappBootstrapUrl = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Vault provider").setDesc("Cloud provider for projects.json mirror.").addDropdown((dd) => dd.addOptions({
      local: "Local",
      dropbox: "Dropbox",
      "google-drive": "Google Drive",
      onedrive: "OneDrive",
      github: "GitHub",
      "icloud-drive": "iCloud Drive (local path)"
    }).setValue(this.plugin.settings.provider).onChange(async (value) => {
      this.plugin.settings.provider = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Provider vault path").setDesc("OneDrive: folder path. GitHub: owner/repo[/folder]. iCloud: absolute local folder path.").addText((text) => text.setValue(this.plugin.settings.providerVaultPath).onChange(async (value) => {
      this.plugin.settings.providerVaultPath = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Provider token").setDesc("OneDrive: OAuth access token. GitHub: PAT token. Not needed for local iCloud path.").addText((text) => text.setValue(this.plugin.settings.providerToken).onChange(async (value) => {
      this.plugin.settings.providerToken = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Provider ref/branch").setDesc("GitHub branch (default: main). Ignored by other providers.").addText((text) => text.setPlaceholder("main").setValue(this.plugin.settings.providerRef || "main").onChange(async (value) => {
      this.plugin.settings.providerRef = value.trim() || "main";
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Save projects to vault").setDesc("Mirror projects from localStorage to a JSON file in your vault.").addToggle((toggle) => toggle.setValue(this.plugin.settings.enableVaultMirror).onChange(async (value) => {
      this.plugin.settings.enableVaultMirror = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Save images as links").setDesc("On: images are saved as linked files in vault mirror folder. Off: images stay embedded (base64).").addToggle((toggle) => toggle.setValue(this.plugin.settings.saveImagesAsLinks).onChange(async (value) => {
      this.plugin.settings.saveImagesAsLinks = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Vault mirror folder").setDesc(`Folder inside the vault for ${VAULT_MIRROR_FILENAME} (relative to vault root).`).addText((text) => text.setPlaceholder(DEFAULT_SETTINGS.vaultMirrorFolder).setValue(this.plugin.settings.vaultMirrorFolder).onChange(async (value) => {
      this.plugin.settings.vaultMirrorFolder = value.trim() || DEFAULT_SETTINGS.vaultMirrorFolder;
      await this.plugin.saveSettings();
    }));
  }
};
async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });
}
function parseImageDataUrl(value) {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const base64 = match[2];
  try {
    return { mime, buffer: base64ToArrayBuffer(base64) };
  } catch {
    return null;
  }
}
function base64ToArrayBuffer(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
function extFromMime(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/svg+xml") return "svg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "img";
}
function dirnamePosix(path) {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(0, idx) : "";
}
function shortHash(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
function extractDataTransferTextCandidates(dt) {
  const keys = ["obsidian://file", "text/x-obsidian-path", "text/uri-list", "text/plain"];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const key of keys) {
    const raw = dt.getData(key);
    if (!raw) continue;
    const parts = raw.split(/\r?\n/g).map((v) => v.trim()).filter((v) => Boolean(v) && !v.startsWith("#"));
    for (const part of parts) {
      if (seen.has(part)) continue;
      seen.add(part);
      out.push(part);
    }
  }
  return out;
}
function fileExt(name) {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return "";
  return name.slice(idx + 1).toLowerCase();
}
function isImageExt(ext) {
  return /\b(png|jpe?g|gif|webp|svg)\b/i.test(ext);
}
function isMarkdownExt(ext) {
  return ext === "md" || ext === "markdown";
}
function mimeByExt(ext) {
  const low = ext.toLowerCase();
  if (low === "png") return "image/png";
  if (low === "jpg" || low === "jpeg") return "image/jpeg";
  if (low === "gif") return "image/gif";
  if (low === "webp") return "image/webp";
  if (low === "svg") return "image/svg+xml";
  return "application/octet-stream";
}
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
async function safeResponseText(res) {
  try {
    return (await res.text()).slice(0, 400);
  } catch {
    return "";
  }
}
function parseGitHubTarget(input) {
  const raw = input.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/^\/+|\/+$/g, "");
  if (!raw) return null;
  const parts = raw.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  const folder = parts.slice(2).join("/");
  if (!owner || !repo) return null;
  return { owner, repo, folder };
}
function normalizeFsPath(value) {
  if (/^[a-zA-Z]:[\\/]/.test(value)) return value.replace(/\//g, "\\");
  if (value.startsWith("\\\\")) return value;
  return value;
}
function extractObsidianOpenUri(value) {
  const match = value.match(/obsidian:\/\/open\?[^\s"']+/i);
  return match ? match[0] : null;
}
function looksLikeMarkdownText(value) {
  const text = value.trim();
  if (!text) return false;
  return /^#{1,6}\s+/m.test(text) || /^\s*[-*+]\s+/m.test(text) || /^\s*\d+\.\s+/m.test(text) || /```[\s\S]*```/m.test(text) || /\[[^\]]+]\([^)]+\)/m.test(text) || /!\[[^\]]*]\([^)]+\)/m.test(text);
}
function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}
function getPluginInstallFolderName(manifest) {
  if (manifest.dir) {
    const tail = manifest.dir.split("/").filter(Boolean).pop();
    if (tail) return tail;
  }
  return manifest.id;
}
async function ensureVaultFolderExists(app, folderPath) {
  const adapter = app.vault.adapter;
  const parts = (0, import_obsidian.normalizePath)(folderPath).split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!await adapter.exists(current)) {
      await adapter.mkdir(current);
    }
  }
}
async function downloadWebappTreeToPluginFolder(app, manifest, baseUrlRaw) {
  const baseUrl = ensureTrailingSlash(baseUrlRaw);
  const base = new URL(baseUrl);
  const queue = ["embedded.html", "index.html"];
  const seen = /* @__PURE__ */ new Set();
  const payloads = /* @__PURE__ */ new Map();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  while (queue.length > 0) {
    const rel = sanitizeRelPath(queue.shift() || "");
    if (!rel || seen.has(rel)) continue;
    seen.add(rel);
    const url = new URL(rel, base);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      if (rel === "embedded.html" || rel === "index.html") continue;
      throw new Error(`HTTP ${res.status} while fetching ${url.toString()}`);
    }
    const buf = await res.arrayBuffer();
    payloads.set(rel, buf);
    if (!isLikelyTextFile(rel, res.headers.get("content-type") || "")) continue;
    const text = decoder.decode(buf);
    const refs = extractRelativeRefsFromText(text, url, base);
    for (const next of refs) {
      const clean = sanitizeRelPath(next);
      if (!clean || seen.has(clean)) continue;
      queue.push(clean);
    }
  }
  if (!payloads.has("embedded.html") && !payloads.has("index.html")) return false;
  if (!payloads.has("embedded.html") && payloads.has("index.html")) {
    const embedded = buildEmbeddedHtmlFromPayloads(payloads, decoder);
    if (embedded) {
      payloads.set("embedded.html", encoder.encode(embedded).buffer);
    }
  }
  const adapter = app.vault.adapter;
  const configDir = app.vault.configDir;
  const folder = getPluginInstallFolderName(manifest);
  const root = (0, import_obsidian.normalizePath)(`${configDir}/plugins/${folder}/webapp`);
  await ensureVaultFolderExists(app, root);
  for (const [rel, buf] of payloads.entries()) {
    const target = (0, import_obsidian.normalizePath)(`${root}/${rel}`);
    const dir = dirnamePosix(target);
    if (dir) await ensureVaultFolderExists(app, dir);
    await adapter.writeBinary(target, buf);
  }
  return true;
}
function buildEmbeddedHtmlFromPayloads(payloads, decoder) {
  const indexBuffer = payloads.get("index.html");
  if (!indexBuffer) return null;
  let html = decoder.decode(indexBuffer);
  const cssRefs = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^\"]+)"[^>]*>/g)];
  const inlineCssBlocks = [];
  for (const ref of cssRefs) {
    const rel = sanitizeRelPath(ref[1]);
    const cssBuffer = rel ? payloads.get(rel) : null;
    if (!cssBuffer) continue;
    const css = sanitizeInlineCss(decoder.decode(cssBuffer));
    inlineCssBlocks.push(`<style>
${css}
</style>`);
    html = html.replace(ref[0], "");
  }
  const jsRefs = [...html.matchAll(/<script[^>]*type="module"[^>]*src="([^\"]+)"[^>]*><\/script>/g)];
  const inlineJsBlocks = [];
  for (const ref of jsRefs) {
    const rel = sanitizeRelPath(ref[1]);
    const jsBuffer = rel ? payloads.get(rel) : null;
    if (!jsBuffer) continue;
    const js = sanitizeInlineJs(decoder.decode(jsBuffer));
    inlineJsBlocks.push(js);
    html = html.replace(ref[0], "");
  }
  html = html.replace(/<link[^>]+rel="icon"[^>]*>\s*/g, "");
  html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>\s*/g, "");
  if (inlineCssBlocks.length) {
    html = html.replace("</head>", `${inlineCssBlocks.join("\n")}
  </head>`);
  }
  if (inlineJsBlocks.length) {
    html = html.replace("</body>", `    <script type="module">
${inlineJsBlocks.join("\n")}
<\/script>
  </body>`);
  }
  return html;
}
function sanitizeInlineJs(code) {
  return code.replace(/<\/script/gi, "<\\/script").replace(/\/\/# sourceMappingURL=.*$/gm, "").replace(/\/\*# sourceMappingURL=.*?\*\//g, "");
}
function sanitizeInlineCss(code) {
  return code.replace(/<\/style/gi, "<\\/style").replace(/\/\*# sourceMappingURL=.*?\*\//g, "");
}
function sanitizeRelPath(path) {
  const clean = path.replace(/[#?].*$/, "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!clean) return "";
  if (clean.startsWith("../")) return "";
  if (clean.includes("://")) return "";
  return clean;
}
function isLikelyTextFile(relPath, contentType) {
  const low = relPath.toLowerCase();
  if (/\.(html?|js|mjs|cjs|css|json|txt|map)$/.test(low)) return true;
  return /\b(text|javascript|json|css|html)\b/i.test(contentType);
}
function extractRelativeRefsFromText(text, currentUrl, baseUrl) {
  const refs = /* @__PURE__ */ new Set();
  const pathname = currentUrl.pathname.toLowerCase();
  const isHtml = pathname.endsWith(".html") || pathname.endsWith(".htm");
  const isCss = pathname.endsWith(".css");
  const isJs = /\.(js|mjs|cjs)$/.test(pathname);
  const addRef = (candidate) => {
    const raw = candidate.trim().replace(/^['"]|['"]$/g, "");
    if (!raw || raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("mailto:")) return;
    let resolved;
    try {
      resolved = new URL(raw, currentUrl);
    } catch {
      return;
    }
    if (resolved.origin !== baseUrl.origin) return;
    const basePath = ensureTrailingSlash(baseUrl.pathname);
    if (!resolved.pathname.startsWith(basePath)) return;
    const rel = sanitizeRelPath(resolved.pathname.slice(basePath.length));
    if (rel) refs.add(rel);
  };
  let m;
  if (isHtml) {
    const htmlAttr = /(src|href)\s*=\s*["']([^"']+)["']/gi;
    while ((m = htmlAttr.exec(text)) !== null) addRef(m[2]);
  }
  if (isCss) {
    const cssUrl = /url\(([^)]+)\)/gi;
    while ((m = cssUrl.exec(text)) !== null) addRef(m[1]);
  }
  if (isJs) {
    const dynamicImport = /import\(\s*["']([^"']+)["']\s*\)/g;
    while ((m = dynamicImport.exec(text)) !== null) addRef(m[1]);
    const fromImport = /\bfrom\s*["']([^"']+)["']/g;
    while ((m = fromImport.exec(text)) !== null) addRef(m[1]);
    const workerOrUrl = /new\s+URL\(\s*["']([^"']+)["']/g;
    while ((m = workerOrUrl.exec(text)) !== null) addRef(m[1]);
  }
  return Array.from(refs);
}
function isLocalhostHttpUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = (url.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}
