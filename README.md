# 南瀛歌唱比賽 LED 主視覺

React + Vite + Tailwind 製作的 21:9 LED 主視覺畫面，包含舞台光束、環境呼吸光、低頻麥克風反應光暈與底部聲波牆。

## 開發

需要先安裝 Node.js LTS。

```bash
npm install
npm run dev
```

開啟瀏覽器：

```txt
http://localhost:5173
```

活動現場建議使用 Chrome 或 Edge 全螢幕播放。麥克風互動在 `localhost` 或 `https` 環境下最穩定。

## Windows 使用

在 Windows 電腦安裝 Node.js 後：

```bash
git clone https://github.com/dotasbl/nanying-stage-screen.git
cd nanying-stage-screen
npm install
npm run dev
```

再用 Chrome / Edge 打開 `http://localhost:5173`。

## 建置

```bash
npm run build
npm run preview
```

`dist/` 會是可部署到靜態網站或 GitHub Pages 的輸出。

## GitHub Pages

此專案的 Vite `base` 設為 `./`，可支援 GitHub Pages 的子路徑部署。推上 GitHub 後會透過 GitHub Actions 將 `dist/` 部署到 Pages。

公開網址：

```txt
https://dotasbl.github.io/nanying-stage-screen/
```
