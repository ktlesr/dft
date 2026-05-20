"use client";

import { useState } from "react";
import { 
  BookOpen, 
  ShieldAlert, 
  Users, 
  FileSpreadsheet, 
  MessageSquarePlus, 
  CheckCircle,
  LayoutDashboard,
  Settings2,
  CalendarDays,
  BarChart3,
  NotebookPen
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type UserManualModalProps = {
  roles: string[];
};

export function UserManualModal({ roles }: UserManualModalProps) {
  const [open, setOpen] = useState(false);
  const isAdmin = roles.includes("ADMIN");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand" className="w-full gap-2 shadow-sm transition-all hover:shadow-md">
          <BookOpen className="h-4 w-4" />
          Kullanım Kılavuzunu Görüntüle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto p-0 sm:rounded-2xl">
        <div className="sticky top-0 z-10 border-b bg-background/95 p-6 pb-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">Portal Kullanım Kılavuzu</DialogTitle>
                <DialogDescription className="mt-1.5 text-xs">
                  Aşağıdaki yetki ve menüler hesabınıza tanımlı roller baz alınarak listelenmektedir.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-8 p-6 pt-4">
          {/* HERKESİN GÖREBİLDİĞİ TEMEL YETKİLER */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-4 w-4" /> Temel Yetkileriniz (Grup Üyesi)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FeatureCard 
                icon={LayoutDashboard} 
                title="Ana Panel & Profil" 
                desc="Tüm genel duyuruları görebilir, kendi profil ve uzmanlık bilgilerinizi güncelleyebilirsiniz." 
              />
              <FeatureCard 
                icon={Users} 
                title="Çalışma Grubum" 
                desc="Grubunuza ait forum, toplantılar, KPI grafikleri ve notlar sekmesine tam erişiminiz bulunur." 
              />
              <FeatureCard 
                icon={MessageSquarePlus} 
                title="Forum Kullanımı" 
                desc="Grubunuzda yeni tartışma konuları başlatabilir ve dosya/kanıt ekleyerek yanıtlara katılabilirsiniz." 
              />
              <FeatureCard 
                icon={CheckCircle} 
                title="Özel KPI Gerçekleşmeleri" 
                desc="Grubunuza tanımlı Özel KPI'ları tamamladığınızda kanıt dosyası yükleyip gerçekleşme verisi girebilirsiniz." 
              />
            </div>
          </section>

          {/* ADMIN YETKİLERİ */}
          {isAdmin && (
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
                <ShieldAlert className="h-4 w-4" /> Sistem Yöneticisi (Admin) Yetkileri
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FeatureCard 
                  icon={Settings2} 
                  title="Tam Yönetim Paneli" 
                  desc="Kullanıcı davet etme, grupları yönetme, rolleri atama ve sistem genelindeki tüm verileri görme yetkisi." 
                  variant="admin"
                />
                <FeatureCard 
                  icon={BarChart3} 
                  title="KPI & Baseline Kontrolü" 
                  desc="Özel KPI'ların başlangıç (Baseline) hedeflerini silebilir veya revize edebilirsiniz." 
                  variant="admin"
                />
                <FeatureCard 
                  icon={CalendarDays} 
                  title="Genel Panoda Bildirim" 
                  desc="Tüm portal kullanıcılarına açık duyurular (Bildirimler) yayınlayabilirsiniz." 
                  variant="admin"
                />
                <FeatureCard 
                  icon={FileSpreadsheet} 
                  title="Tüm Formlara Erişim" 
                  desc="Tüm gruplar için Rapor, KS Notu, Danışman Notu ve Toplantı oluşturabilirsiniz." 
                  variant="admin"
                />
              </div>
            </section>
          )}

          {/* MODERATÖR YETKİLERİ */}
          {(isAdmin || roles.includes("MODERATOR")) && (
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500">
                <Users className="h-4 w-4" /> Grup Moderatörü Yetkileri
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FeatureCard 
                  icon={BarChart3} 
                  title="Özel KPI Oluşturma" 
                  desc="Grubunuza manuel takip edilecek özel (Custom) KPI hedefleri ekleyebilirsiniz." 
                />
                <FeatureCard 
                  icon={CheckCircle} 
                  title="KPI Onay / Ret" 
                  desc="Grup üyelerinin girdiği KPI gerçekleşme kanıtlarını inceleyip onaylayabilir veya reddedebilirsiniz." 
                />
                <FeatureCard 
                  icon={CalendarDays} 
                  title="Gruba Özel Bildirim" 
                  desc="Sadece grubunuzun görebileceği özel duyurular (Bildirimler) ekleyebilirsiniz." 
                />
              </div>
            </section>
          )}

          {/* RAPORTÖR YETKİLERİ */}
          {(isAdmin || roles.includes("RAPPORTEUR")) && (
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <FileSpreadsheet className="h-4 w-4" /> Raportör Yetkileri
              </h3>
              <div className="grid gap-3">
                <FeatureCard 
                  icon={FileSpreadsheet} 
                  title="Rapor ve Tutanak Girişi" 
                  desc="Toplantı tutanaklarını ve grubunuzun dönemsel faaliyet raporlarını sisteme yükleme yetkiniz bulunur." 
                />
              </div>
            </section>
          )}

          {/* DANIŞMAN YETKİLERİ */}
          {(isAdmin || roles.includes("ADVISOR")) && (
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">
                <NotebookPen className="h-4 w-4" /> Danışman Yetkileri
              </h3>
              <div className="grid gap-3">
                <FeatureCard 
                  icon={NotebookPen} 
                  title="Danışman Notu Ekleme" 
                  desc="Grubun ilerleyişini inceleyerek onlara yön verici, değerlendirme ve geribildirim amaçlı Danışman Notu girebilirsiniz." 
                />
              </div>
            </section>
          )}

          {/* KS YETKİLERİ */}
          {(isAdmin || roles.includes("KS")) && (
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <ShieldAlert className="h-4 w-4" /> Kalite Sorumlusu Yetkileri
              </h3>
              <div className="grid gap-3">
                <FeatureCard 
                  icon={ShieldAlert} 
                  title="KS Notu Ekleme" 
                  desc="Süreçlerin kalite standartlarına uyumunu denetleyerek kalite uyarıları veya değerlendirmeleri içeren KS Notu ekleyebilirsiniz." 
                />
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  desc, 
  variant = "default" 
}: { 
  icon: any, 
  title: string, 
  desc: string,
  variant?: "default" | "admin"
}) {
  return (
    <div className={`group relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md ${
      variant === "admin" 
        ? "bg-primary/5 hover:bg-primary/10 hover:border-primary/30" 
        : "bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/30"
    }`}>
      <div className="flex gap-4">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          variant === "admin" ? "bg-primary/20 text-primary" : "bg-background text-foreground shadow-sm"
        }`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </div>
    </div>
  );
}
