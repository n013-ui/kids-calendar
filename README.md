# 小孩行事曆

給小孩用 iPad / 手機檢視媽媽安排的行事，可依「年、月、日、時間區段」瀏覽，並打勾標記完成。
資料存在 Google Sheets，後端用 Google Apps Script (GAS)，前端是純靜態網頁，部署在 GitHub Pages。

## 專案結構

```
gas/            Apps Script 後端原始碼（已用 clasp 建立並部署）
  Code.gs
  appsscript.json
docs/           前端靜態網頁（部署到 GitHub Pages 的資料夾）
  index.html    小孩檢視頁（免登入即可看到內容，但需已登入某個 Google 帳號，見下方說明）
  admin.html    媽媽後台頁（密碼保護，用來新增/編輯/刪除行事）
  config.js     填入 GAS 部署網址的地方
  app.js        小孩頁邏輯
  admin.js      後台頁邏輯
  shared.js     共用工具（呼叫 GAS API、日期/顏色小工具）
  style.css     樣式
```

## 已完成的設定

- 已用 `clasp` 建立一個新的 Google試算表＋綁定的 Apps Script 專案：
  - Google Sheet：https://docs.google.com/spreadsheets/d/1Y3iyOokWVQRc1Ethqw3Fyw6qzFa5xVPPo28wWp75x0E/edit
  - Apps Script 編輯器：https://script.google.com/d/1OdRHGf4QRB05kZoThFfmC6DYDhO5shDn0FbRDDUKgqkR-zG25ALDqaIy/edit
- 已部署為網頁應用程式，網址已經填在 `docs/config.js`：
  `https://script.google.com/macros/s/AKfycbxXOT775JikHMpgVrJuMfMRDessBlkFAapEa_yVqBSirZL3Js4PsHXbkrUq1sg6kNql/exec`
- Sheet 會在第一次寫入時自動建立 `Events` 分頁，欄位：
  `ID | ChildName | Year | Month | Day | StartTime | EndTime | Title | Note | Done | UpdatedAt`
- 已建立 GitHub repo 並推送：https://github.com/n013-ui/kids-calendar
- 已開啟 GitHub Pages（來源：`main` 分支的 `/docs` 資料夾）：
  - 小孩用：https://n013-ui.github.io/kids-calendar/index.html
  - 媽媽後台：https://n013-ui.github.io/kids-calendar/admin.html
  - 第一次部署需要幾分鐘建置，稍後再開啟

### ⚠️ 關於「免登入」的限制

clasp 目前是用你的學校 Google Workspace 帳號（`n013@nkjh.tyc.edu.tw`）登入。
測試後發現這個網域的管理員政策**禁止**把 Apps Script 網頁應用程式設為「任何人，包括匿名使用者」，
只能設為「任何人（需要登入 Google 帳號）」。

也就是說：**小孩的 iPad / 手機瀏覽器需要先登入「任何一個」Google 帳號**（不一定要跟這個試算表相關），
才能打開 `index.html` 看到行事曆內容；不需要登入的效果目前在這個學校帳號下無法達成。

如果之後想要真正做到完全免登入即可看：
- 可以改用個人 Gmail 帳號重新建立這個 Google Sheet + Apps Script 專案（`clasp login` 換帳號後告訴我，我可以重新部署），或
- 請學校 IT 管理員開放「Anyone, even anonymous」的 Apps Script 發佈權限。

## 待你完成的步驟

### 1. 設定媽媽後台密碼

1. 打開 Apps Script 編輯器（上面的連結）
2. 左側「專案設定」(齒輪圖示) → 「指令碼屬性」(Script Properties)
3. 新增一筆：鍵 = `ADMIN_PASSWORD`，值 = 你想要的密碼
4. 存檔即可，不用重新部署

沒有設定這個屬性之前，後台的新增/編輯/刪除會全部失敗（回傳「尚未設定 ADMIN_PASSWORD」）。
小孩打勾完成不需要密碼，不受影響。

### 2. 新增第一筆行事測試

打開媽媽後台頁面 → 用剛剛設定的密碼登入 → 新增一筆行事（記得填小孩姓名）→
到小孩檢視頁選擇該小孩、切到對應的月份，點日期應該會看到剛新增的行事，打勾後
可以到 Google Sheet 的 `Events` 分頁確認 `Done` 欄位有沒有變成 `TRUE`。

## 之後如何修改程式

- 前端：直接改 `docs/` 裡的檔案，`git push` 後 GitHub Pages 會自動更新（約 1-2 分鐘）。
- 後端：改 `gas/Code.gs` 後，在 `gas/` 資料夾內執行：

```bash
clasp push
clasp deploy -i AKfycbxXOT775JikHMpgVrJuMfMRDessBlkFAapEa_yVqBSirZL3Js4PsHXbkrUq1sg6kNql -d "說明文字"
```

（用 `-i` 更新同一個部署，網址才不會變，`docs/config.js` 就不用改。）
