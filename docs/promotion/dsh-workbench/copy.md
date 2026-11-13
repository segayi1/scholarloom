# 小红书推广文案 · DSH 文献工作台

## 标题（选一个）

1. 把文献库接进 DSH，读论文不再割裂
2. 读文献最痛的，是窗口切来切去
3. 我把文献库接进了 DeepSeek Harness

## 正文

读文献最痛的不是英文。
是 PDF、阅读卡、问答、笔记各开一个窗口。

刚在原文看到一句，切去记笔记，页码忘了；
想追问一句，又要在 PDF 里翻半天；
点开深读，原文直接消失。

所以我把 ScholarLoom 接进了 DeepSeek Harness，
做成一个**本地文献工作台**：
左边解读，右边原文，永远同屏。

📚 **它能做什么**

**01 / 文库 + 阅读卡**
Zotero / 本地题录、分类、阅读状态、阅读笔记都在本地。
按标题、作者、DOI、关键词搜，我的 91 篇文献可以秒定位。

**02 / 原文和解读并排**
PDF 连续上下滚，不用一页一页点；
文字可以直接选中、复制；
速览 / 深读 / 问答 / 笔记 / 记忆五个页签，
切页签不丢原文。

**03 / 深读，逐单元对应原文**
不是只给一段总览。
每个实验单元都有研究问题、设计、结果、解读、局限；
每条来源先放**原文**，再放模型解读；
点「跳到原文」直接定位到具体段落，金色高亮。

**04 / 问答有页码，记忆可编辑**
回答里的 `p.12` 可以直接跳；
证据列表可以展开；
阅读记忆可以新增/删除，问答默认使用。

**05 / 本地优先**
数据在本地 SQLite 和 PDF 里；
服务只监听 `127.0.0.1`；
DSH 插件只是客户端，不建第二份库。

🧩 **本地版和插件版，分别配置**

- 本地版：`python server.py --port 8766`
- DSH 插件版：`dsh-plugin/install.ps1 -BaseUrl http://127.0.0.1:8766`
- 可以只用本地版，也可以两个一起用；
- 换端口只改插件的 `baseUrl`，不用改代码。

🚀 **装起来**

```powershell
git clone https://github.com/segayi1/scholarloom
cd scholarloom
.\.venv\Scripts\python.exe server.py
powershell -ExecutionPolicy Bypass -File .\dsh-plugin\install.ps1 -Profile desktop
```

然后 DSH 左侧点「文献工作台」。

⚠️ **说清楚**
- 本地优先，需要自己跑服务，不是开箱即用的云产品；
- 扫描版 / 纯图片 PDF 没有文本层，不能选字；
- 段落高亮是临时对照，不是持久批注；
- 记忆页目前固定 `project=default`。

项目开源在 GitHub：
`github.com/segayi1/scholarloom`

安装、配置和端口对照：
`docs/CONFIGURATION.md`

#文献阅读 #科研工具 #DeepSeek #Zotero #PDF阅读 #效率工具 #科研日常 #本地优先 #开源

## 首评

补充一下：这个是 **DeepSeek Harness 的插件**，不是另一个云笔记。
本地服务跑在 `127.0.0.1:8766`，插件只负责把文库、PDF、问答和阅读记忆接到 DSH 面板里；不建第二份数据库，也不上传论文。

## 配图

7 张 3:4 轮播图，见同目录 `01-cover.png` 到 `07-install.png`。
页面源文件是 `slides.html`；用 Chrome headless 逐张渲染（1080×1440）。

```powershell
chrome --headless=new --window-size=1080,1440 `
  --screenshot=01-cover.png "file:///.../slides.html?slide=1"
```
