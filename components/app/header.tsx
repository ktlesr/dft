"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Menu, Search, Settings2, User as UserIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sidebar } from "@/components/app/sidebar";
import { SignOutMenuItem } from "@/components/app/sign-out-menu-item";
import { ROLE_LABELS } from "@/lib/constants";
import { avatarUrl, initials } from "@/lib/utils";
import type { Role } from "@prisma/client";

type HeaderProps = {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    roles: Role[];
    groupCode: string | null;
    groupDescription: string | null;
  };
  unreadNotifications?: number;
};

export function Header({ user, unreadNotifications = 0 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      {/* Mobile sidebar trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menüyü aç">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar user={user} className="w-full border-r-0" />
        </SheetContent>
      </Sheet>

      {/* Search — submits to /ara as GET ?q=... */}
      <form action="/ara" method="get" className="relative hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          placeholder="Portal içinde ara…"
          className="pl-9"
          aria-label="Portal içinde ara"
          minLength={2}
          maxLength={100}
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="relative" aria-label="Bildirimler">
          <Link href="/bildirimler" prefetch={false}>
            <Bell className="h-[1.1rem] w-[1.1rem]" />
            {unreadNotifications > 0 ? (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 py-0 text-[10px] leading-none"
              >
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </Badge>
            ) : null}
          </Link>
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2">
              <Avatar className="h-8 w-8">
                {user.image ? (
                  <AvatarImage src={avatarUrl(user.id, user.image)} alt={user.name ?? user.email} />
                ) : null}
                <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-none">{user.name ?? user.email}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {user.roles.map((r) => ROLE_LABELS[r]).join(" · ")}
                </span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{user.name ?? user.email}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profilim">
                <UserIcon className="h-4 w-4" />
                <span>Profilim</span>
              </Link>
            </DropdownMenuItem>
            {user.roles.includes("ADMIN") ? (
              <DropdownMenuItem asChild>
                <Link href="/yonetim">
                  <Settings2 className="h-4 w-4" />
                  <span>Yönetim Paneli</span>
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <SignOutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
