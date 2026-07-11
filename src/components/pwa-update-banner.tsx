/**
 * Banner de atualização do PWA.
 *
 * Exibe uma notificação na parte inferior da tela quando uma nova versão
 * do service worker está disponível. O usuário pode atualizar imediatamente
 * ou dispensar o aviso.
 *
 * Usa o hook `useRegisterSW` do `vite-plugin-pwa/react` que fica disponível
 * após o build de produção (não aparece no dev, pois devOptions.enabled=false).
 */
import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

export function PwaUpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Verifica nova versão a cada 60 minutos enquanto o app está aberto
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        registration.update().catch(() => {/* silencioso */});
      }, 60 * 60 * 1000);
    },
  });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (needRefresh) setVisible(true);
  }, [needRefresh]);

  function dismiss() {
    setVisible(false);
    setNeedRefresh(false);
  }

  function update() {
    updateServiceWorker(true);
  }

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom) + 12px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "var(--text-primary)",
        color: "var(--background)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 18px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        maxWidth: "calc(100vw - 32px)",
        width: "max-content",
        animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        fontFamily: "Inter, sans-serif",
        fontSize: "14px",
        fontWeight: 500,
      }}
    >
      <RefreshCw size={18} style={{ flexShrink: 0, color: "var(--accent)" }} />
      <span style={{ flexGrow: 1, whiteSpace: "nowrap" }}>
        Nova versão disponível!
      </span>
      <button
        onClick={update}
        style={{
          background: "var(--primary)",
          color: "white",
          border: "none",
          borderRadius: "var(--radius-md)",
          padding: "6px 14px",
          fontWeight: 700,
          fontSize: "13px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Atualizar
      </button>
      <button
        onClick={dismiss}
        aria-label="Dispensar"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
