# 櫃檯

桌面上的像素辦公室。Cursor 雲端代理和 Grok 機器人會站在自己的房間裡。介面是繁體中文。這是一個桌面視窗，不是瀏覽器分頁。

```bash
cd office
npm install
npm start
```

`npm start` 會打開標題為「櫃檯」的視窗。畫面上有接待、Cursor 室、休息區和 Grok 室，左邊是名單，下面是動態。

Grok 機器人若要回報狀態，資料服務會跟視窗一起聽 `http://127.0.0.1:4760`。這個網址給機器人送心跳，人看的是視窗。

## 接上 Cursor

到 Cursor 的儀表板 → API Keys 建立一把使用者金鑰，存進 `~/.cursor-office/config.json`。這個檔案不要提交。

```json
{ "cursorApiKey": "crsr_..." }
```

也可以改用環境變數 `CURSOR_API_KEY`。程式每 8 秒讀一次雲端代理清單。

模型名稱含有 `grok` 的 Cursor 代理會站進 Grok 室。清單若沒有帶回模型，那位代理會先留在 Cursor 室。

## 接上 Grok

同一個機器上的 Grok 機器人每兩分鐘內送一次心跳。超過時間角色會離開。

```bash
curl -s http://127.0.0.1:4760/api/inbox \
  -H 'content-type: application/json' \
  -d '{"id":"my-grok","name":"Grok","provider":"grok","status":"working","task":"正在回覆","model":"grok-4.7"}'
```

`provider` 設成 `grok`，或 `model` 含有 `grok`，就會進 Grok 室。這兩個欄位名稱要保持英文，伺服器才認得出來。

也可以把同一格式的陣列放在 `~/.cursor-office/agents.json`。API 有同一個人時，以 API 為準；心跳再蓋過 API。

家具和人物是程式自己畫的，沒有使用別的辦公室專案的圖檔。
