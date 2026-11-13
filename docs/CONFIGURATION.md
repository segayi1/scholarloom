# 本地版与 DSH 插件版：安装与分别配置

ScholarLoom 现在有两种使用形态，**代码在同一个仓库里，但配置互相独立**：

| | 本地版 | DSH 插件版 |
| --- | --- | --- |
| 入口 | 浏览器打开 `http://127.0.0.1:8766` | DSH 左侧「文献工作台」 |
| 代码 | 仓库根目录：`server.py`、`web/` | [`dsh-plugin/`](../dsh-plugin/) |
| 数据 | 本地 `data/workbench.sqlite` 与 PDF | 不建库，只读本地版 API |
| 配置 | 端口、数据目录、模型/Zotero 设置 | `baseUrl`、`projectDir`、`autoStart` 等 |

**两种形态可以同时存在。** DSH 插件连接的是本地版服务，不会另建一份题录或阅读状态；本地版仍然是唯一数据源。

---

## 1. 本地版

### 启动

Windows：

```powershell
# 方式 A：默认 8766
.\.venv\Scripts\python.exe server.py

# 方式 B：换端口，例如 8767
.\.venv\Scripts\python.exe server.py --port 8767
```

也可以双击：

- `launch.vbs`：检查/启动 `127.0.0.1:8766`，然后打开浏览器；
- `launch-desktop.ps1`：使用 `127.0.0.1:8767`，并带“有任务进行中时不要重启”的保护。

macOS / Linux：

```bash
python3 server.py --port 8766
```

### 本地版配置

| 配置 | 位置 | 说明 |
| --- | --- | --- |
| 端口 | `--port` 参数 | 默认 8766；插件 `baseUrl` 必须与它一致 |
| 数据目录 | 固定为仓库下 `data/` | 题录、任务、阅读记忆、PDF 备份都在这里 |
| 模型服务 | 网页「设置」 | 地址、模型名、API Key；密钥保存在 `data/secrets.bin`（Windows DPAPI） |
| Zotero | 网页「设置」 | 可选；不配置也能本地导入 |
| 监看目录 | 网页「设置」 | 收文监看文件夹 |
| 提示词/语言 | 网页「设置」 | 阅读卡、问答、深读共用 |

> **不要**用两个本地服务同时指向同一个 `data/` 目录。需要两套完全独立的数据时，复制一份项目目录（或单独指定数据目录的部署方式）再启动。

### 验证本地版

```powershell
curl http://127.0.0.1:8766/api/health
```

应返回：

```json
{"ok": true, "app": "scholarloom", "version": "2.1.2"}
```

---

## 2. DSH 插件版

### 安装

在仓库根目录：

```powershell
powershell -ExecutionPolicy Bypass -File .\dsh-plugin\install.ps1 -Profile desktop
```

安装脚本会：

- 复制 `dsh-plugin/` 到 `%USERPROFILE%\.dsh\profiles\desktop\node_modules\dsh-scholarloom`；
- 在 `%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml` 写入带标记的 `scholarloom-workbench` 行；
- 重复执行会重建这一行，不会重复插入。

开发时链接安装：

```powershell
powershell -ExecutionPolicy Bypass -File .\dsh-plugin\install.ps1 -Profile desktop -Link
```

卸载：

```powershell
powershell -ExecutionPolicy Bypass -File .\dsh-plugin\install.ps1 -Profile desktop -Uninstall
```

### 插件配置

配置文件：

```text
%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml
```

找到 `scholarloom-workbench` 这一行，或直接在 DSH 的「插件」页面编辑该插件的配置。

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `baseUrl` | `http://127.0.0.1:8766` | 本地版地址；换端口时改这里 |
| `projectDir` | 空 | 本地版仓库目录；仅 `autoStart` 开启时使用 |
| `pythonPath` | 空 | 显式 Python；为空时优先 `.venv`，再退回 `python` |
| `autoStart` | `false` | 服务不可用时是否由插件启动本地版 |
| `requestTimeoutMs` | `60000` | 普通 API 超时 |

示例：

```yaml
- insert:
    - id: scholarloom-workbench
      name: 'dsh-scholarloom'
      config:
        baseUrl: http://127.0.0.1:8766
        projectDir: E:\path\to\scholarloom
        pythonPath: ''
        autoStart: false
        requestTimeoutMs: 60000
```

也可以直接用安装参数写配置：

```powershell
powershell -ExecutionPolicy Bypass -File .\dsh-plugin\install.ps1 `
  -Profile desktop `
  -BaseUrl http://127.0.0.1:8767 `
  -ProjectDir E:\path\to\scholarloom `
  -AutoStart
```

> `autoStart` 默认关闭。开启前务必确认 `projectDir` 指向你想服务的文库，避免旧服务停止时静默切换到另一个数据库。

### 验证插件

```powershell
curl http://127.0.0.1:62870/scholarloom/health
```

端口以 DSH 实际 Web 端口为准（DSH 设置页/启动日志会显示）。应返回：

```json
{"ok": true, "connected": true, "baseUrl": "http://127.0.0.1:8766"}
```

---

## 3. 三种常见组合

### A. 只用本地版

```powershell
.\.venv\Scripts\python.exe server.py --port 8766
```

浏览器打开 `http://127.0.0.1:8766`。不需要安装 DSH 插件。

### B. 本地版 + DSH 插件（推荐）

```powershell
# 1. 本地版
.\.venv\Scripts\python.exe server.py --port 8766

# 2. 插件
powershell -ExecutionPolicy Bypass -File .\dsh-plugin\install.ps1 -Profile desktop -BaseUrl http://127.0.0.1:8766
```

本地版和插件共用 `data/`，在插件里改阅读状态/笔记会直接写回本地版。

### C. 本地版在 8767，插件指向 8767

```powershell
.\.venv\Scripts\python.exe server.py --port 8767
powershell -ExecutionPolicy Bypass -File .\dsh-plugin\install.ps1 -Profile desktop -BaseUrl http://127.0.0.1:8767
```

`launch-desktop.ps1` 默认就是 8767，适合把本地版和插件分开配置时使用。

---

## 4. 只装插件、不装本地版？

不行。DSH 插件是本地版的客户端，**必须有 ScholarLoom 服务**。它不会自己生成题录或 PDF。

最小安装：

1. 解压/克隆本仓库；
2. 启动 `server.py`；
3. 安装 `dsh-plugin`。

---

## 5. 常见问题

**插件显示“ScholarLoom 未运行”**

- 本地版没启动，或端口不一致；
- 检查 `curl http://127.0.0.1:8766/api/health`；
- 检查插件 `baseUrl`。

**插件和本地版看到的文献数量不同**

- 它们指向了不同数据库：例如历史运行时与工作区分别有自己的 `data/`；
- 插件不会自动迁移或合并，请把 `baseUrl` 指到正确的本地版。

**DSH 升级后插件被禁用**

- 插件 `package.json` 的 `@deepseek-ai/dsh-tools` peer 必须匹配 DSH 版本；
- 本版本面向 DSH `0.2.2-rc.3`、插件 `0.1.3`；
- 升级 DSH 后如提示不兼容，需同步 peer 或安装对应插件版本。

**本地版换端口后插件连不上**

- 同步修改插件 `baseUrl`；
- 修改后切换一次插件（禁用/启用）或重启 DSH 让配置生效。

---

## 6. 目录速查

```text
scholarloom/
├─ server.py                 # 本地版服务
├─ web/                      # 本地版浏览器界面
├─ data/                     # 本地数据库与 PDF 备份
├─ launch.vbs                # 8766 启动器
├─ launch-desktop.ps1        # 8767 启动器
├─ dsh-plugin/               # DSH 插件
│  ├─ lib/index.js           # Host 代理 / 工具 / 启动
│  ├─ lib/client.js          # DSH 面板 / PDF.js / 深读
│  ├─ install.ps1            # 安装/卸载/配置
│  ├─ config.example.yml     # 插件配置示例
│  └─ README.md              # 插件完整说明
└─ docs/CONFIGURATION.md     # 本文
```

自动启动使用 `baseUrl` 的端口。插件关闭或卸载后，已启动的 ScholarLoom 服务继续运行，后台任务会继续；需要停止服务时，请在任务完成后手动停止对应进程。
