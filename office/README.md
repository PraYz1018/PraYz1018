# 櫃檯

一個開在本機的小辦公室。Cursor Cloud Agent 和 Grok bot 會以角色出現在兩個房間裡。

```bash
cd office
npm start
```

打開 http://127.0.0.1:4760 。

## 接上 Cursor

到 Cursor Dashboard → API Keys 建立一把使用者 API 金鑰，存進 `~/.cursor-office/config.json`。這個檔案不要提交。

```json
{ "cursorApiKey": "crsr_..." }
```

也可以改用環境變數 `CURSOR_API_KEY`。程式每 8 秒讀一次 `GET https://api.cursor.com/v1/agents`。狀態 `ACTIVE` 或 `RUNNING` 的人會在房間裡走動。

模型 id 含有 `grok` 的 Cursor agent 會坐進 Grok 房。清單 API 若沒有帶回模型，那位 agent 會先留在 Cursor 房。

## 接上 Grok

同一個機器上的 Grok bot 每兩分鐘內送一次心跳。超過時間角色會離開。

```bash
curl -s http://127.0.0.1:4760/api/inbox \
  -H 'content-type: application/json' \
  -d '{"id":"my-grok","name":"Grok","provider":"grok","status":"working","task":"正在回覆","model":"grok-4.7"}'
```

`provider` 設成 `grok`，或 `model` 含有 `grok`，就會進 Grok 房。

也可以把同一格式的陣列放在 `~/.cursor-office/agents.json`。API 有同一個人時，以 API 為準；心跳再蓋過 API。
