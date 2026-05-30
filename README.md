# FileNest

FileNest 是一款 macOS 桌面工具，用于保存、标签分类、搜索、收藏并快速打开常用文件夹。

## 功能

- 拖拽添加文件夹
- 设置面板以**标签**为主，收藏与显示名为可选项
- 收藏、最近打开、标签筛选与搜索
- 三种主区域布局：Grid / List / Compact
- 导入 / 导出 JSON 备份
- 路径失效检测与提示
- 删除前确认
- 菜单栏 Tray：**点击图标 → 文件夹下拉列表**，底部 **Open FileNest…** 打开主窗口
- 全局快捷键 `Cmd+Shift+F` 显示/隐藏主窗口

> 说明：FileNest **不支持 note（备注）** 功能，分类以标签为主。

## 环境要求

- macOS
- Node.js 18+

## 本地开发

```bash
npm install
npm run dev
```

## 构建与打包

```bash
npm run build
npm run package:mac:arm64
npm run package:mac:x64
npm run package:dmg
```

- `.app` 输出在 `release/`
- `.dmg` 由 `scripts/create-dmg.mjs` 生成
- 可选签名：`CODESIGN_IDENTITY="Developer ID Application: ..." npm run package:dmg`

## 数据存储

文件夹数据保存在 Electron 用户目录：

`~/Library/Application Support/filenest/folders.json`

不会写入项目内的 `data/` 目录。

## 架构

```
React UI  →  folderStore.ts  →  preload.ts  →  main.ts  →  folders.json
```

- React 不直接访问 Node / 文件系统
- 所有读写由 Main 进程负责

## 导入 / 导出

- 侧栏底部 **Import…** / **Export…**
- 导出为 JSON 文件
- 导入时按路径去重；无效路径会被跳过

## 菜单栏

- 点击顶部菜单栏 **FileNest 图标** → 弹出文件夹列表，点击即可在 Finder 打开
- 列表底部 **Open FileNest…** → 打开完整主窗口（管理标签、布局、导入导出）
- 右键菜单与左键相同

## 快捷键

| 快捷键 | 作用 |
|--------|------|
| `Cmd+Shift+F` | 显示 / 隐藏主窗口 |

## 已知限制

- Web 预览模式（Vercel）不支持真实打开 Finder 文件夹
- 未设置签名证书时，DMG 仅适合本地测试

## 许可证

Private project.
