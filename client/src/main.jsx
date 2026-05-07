import "./index.css";
import { sendVkBridgeInitEarly } from "./vkMiniApp";

// ВАЖНО для модерации VK Mini Apps:
// VKWebAppInit должен уйти до загрузки тяжёлого React/Firebase-кода.
// Поэтому главный UI импортируется ниже динамически, только после раннего init.
sendVkBridgeInitEarly({ force: true });

import("./appEntry.jsx").catch((error) => {
  console.error("Не удалось загрузить интерфейс приложения:", error);

  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b0714;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:420px;border:1px solid rgba(255,255,255,.14);border-radius:24px;padding:24px;background:rgba(255,255,255,.08);">
          <div style="font-size:22px;font-weight:800;margin-bottom:8px;">Барахолка</div>
          <div style="font-size:15px;line-height:1.45;color:rgba(255,255,255,.82);">Не удалось загрузить интерфейс. Проверьте подключение к сети и откройте приложение заново.</div>
          <button type="button" onclick="window.location.reload()" style="margin-top:18px;width:100%;border:0;border-radius:14px;padding:13px 16px;font-weight:800;background:#4da3ff;color:#fff;">Обновить</button>
        </div>
      </div>
    `;
  }
});
