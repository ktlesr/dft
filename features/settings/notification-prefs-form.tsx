"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { updateNotificationPrefs, type SettingsFormState } from "./actions";

const INITIAL: SettingsFormState = { ok: true };

export function NotificationPrefsForm({
  defaultLogin,
  defaultLogout,
}: {
  defaultLogin: boolean;
  defaultLogout: boolean;
}) {
  const [state, action, pending] = useActionState(updateNotificationPrefs, INITIAL);

  // Mevcut değerleri kontrollü state'te tutuyoruz; Checkbox shadcn versiyonu
  // native `<input type="checkbox" name=...>` döndürmediği için form'a
  // hidden bir input ekliyoruz (sunucu action'ı `?formData.get("...") === "on"`
  // ile değer alıyor — yani "on" yazarsak true, başka her şey false).
  const [login, setLogin] = React.useState(defaultLogin);
  const [logout, setLogout] = React.useState(defaultLogout);

  React.useEffect(() => {
    if (pending) return;
    if (state.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state, pending]);

  return (
    <form action={action} className="space-y-5">
      {/* Hidden inputs so server action sees "on" when the box is checked */}
      <input
        type="hidden"
        name="loginNotificationsEnabled"
        value={login ? "on" : "off"}
      />
      <input
        type="hidden"
        name="logoutNotificationsEnabled"
        value={logout ? "on" : "off"}
      />

      <label className="flex items-start gap-3 rounded-md border p-4 hover:bg-muted/30">
        <Checkbox
          checked={login}
          onCheckedChange={(v) => setLogin(v === true)}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Giriş bildirimleri</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bir kullanıcı portal'a giriş yaptığında zil bildirimi gönder.
            Kapatırsanız sadece audit loga yazılır.
          </p>
        </div>
      </label>

      <label className="flex items-start gap-3 rounded-md border p-4 hover:bg-muted/30">
        <Checkbox
          checked={logout}
          onCheckedChange={(v) => setLogout(v === true)}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Çıkış bildirimleri</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Kullanıcı çıkış yaptığında zil bildirimi gönder. Varsayılan: kapalı
            — hacim yüksek olabilir.
          </p>
        </div>
      </label>

      <div className="rounded-md border border-muted bg-muted/20 px-4 py-3 text-[12px] text-muted-foreground">
        Doküman, KPI, pano paylaşımı gibi içerik oluşturma bildirimleri bu
        ayarlardan etkilenmez; her zaman çalışır.
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Kaydediliyor…
          </>
        ) : (
          "Kaydet"
        )}
      </Button>
    </form>
  );
}
