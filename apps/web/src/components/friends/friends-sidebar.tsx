"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  LayoutDashboard,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/theme/theme-toggle";
import NotificationsBell from "@/components/notifications/notifications-bell";
import { MeshageLogo } from "@/components/brand/meshage-logo";
export type FriendsSection = "overview" | "friends" | "requests" | "discover";

interface FriendsSidebarProps {
  activeSection: FriendsSection;
  onSectionChange: (section: FriendsSection) => void;
  friendsCount: number;
  requestsCount: number;
}

const navigation: {
  id: FriendsSection;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "friends", label: "My friends", icon: Users },
  { id: "requests", label: "Requests", icon: UserRoundPlus },
  { id: "discover", label: "Discover people", icon: Compass },
];

export default function FriendsSidebar({
  activeSection,
  onSectionChange,
  friendsCount,
  requestsCount,
}: FriendsSidebarProps) {
  const navigationRef = useRef<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const navigationElement = navigationRef.current;

    if (!navigationElement) {
      return;
    }

    function updateScrollButtons() {
      const element = navigationRef.current;

      if (!element) {
        return;
      }

      const maxScrollLeft = element.scrollWidth - element.clientWidth;

      setCanScrollLeft(element.scrollLeft > 2);
      setCanScrollRight(maxScrollLeft - element.scrollLeft > 2);
    }

    updateScrollButtons();

    navigationElement.addEventListener("scroll", updateScrollButtons, {
      passive: true,
    });
    window.addEventListener("resize", updateScrollButtons);

    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(navigationElement);

    return () => {
      navigationElement.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
      resizeObserver.disconnect();
    };
  }, []);

  function scrollNavigation(direction: "left" | "right") {
    navigationRef.current?.scrollBy({
      left: direction === "right" ? 180 : -180,
      behavior: "smooth",
    });
  }

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-3xl bg-[#142348] p-3 text-white shadow-xl shadow-blue-950/10 lg:sticky lg:top-0 lg:h-[calc(100dvh-2.5rem)] lg:w-64 lg:self-start lg:overflow-y-auto lg:px-4 lg:py-6">
      <div className="flex items-center gap-3 px-2 py-2 lg:py-3">
        <MeshageLogo showWordmark={false} markClassName="size-9 lg:size-10" />
        <div>
          <p className="text-sm font-semibold tracking-tight lg:text-base">
            Meshage<span className="text-blue-300">.</span>
          </p>
          <p className="text-[11px] text-blue-100/60 lg:text-xs">
            Your community
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <NotificationsBell />
          <ThemeToggle className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" />
        </div>
      </div>

      <div className="relative mt-3 lg:mt-8">
        <p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100/45 lg:block">
          Workspace
        </p>

        <div className="flex items-center gap-1">
          {canScrollLeft ? (
            <Button
              type="button"
              size="icon"
              aria-label="Show previous friends links"
              onClick={() => scrollNavigation("left")}
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-blue-50 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
            >
              <ChevronLeft className="size-4" />
            </Button>
          ) : null}

          <nav
            ref={navigationRef}
            aria-label="Friends navigation"
            className="flex flex-1 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-none lg:flex-col lg:space-y-1.5 lg:overflow-visible lg:pb-0"
          >
            {navigation.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id;
              const count =
                id === "friends"
                  ? friendsCount
                  : id === "requests"
                    ? requestsCount
                    : null;

              return (
                <Button
                  key={id}
                  variant="ghost"
                  type="button"
                  onClick={() => onSectionChange(id)}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "flex min-w-max flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition-all sm:text-sm lg:w-full lg:flex-none lg:gap-3 lg:py-3",
                    isActive
                      ? "bg-white font-semibold text-[#17294e] shadow-lg shadow-blue-950/10"
                      : "text-blue-50/75 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "size-4",
                      isActive ? "text-primary" : "text-blue-100/65",
                    ].join(" ")}
                  />
                  <span className="flex-1">{label}</span>
                  {count !== null ? (
                    <span
                      className={[
                        "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] lg:min-w-6 lg:px-2 lg:text-xs",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-white/10 text-blue-50/75",
                      ].join(" ")}
                    >
                      {count}
                    </span>
                  ) : null}
                </Button>
              );
            })}
          </nav>

          {canScrollRight ? (
            <Button
              type="button"
              size="icon"
              aria-label="Show more friends links"
              onClick={() => scrollNavigation("right")}
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-blue-50 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
            >
              <ChevronRight className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-auto hidden rounded-2xl border border-white/10 bg-white/6 p-4 lg:block">
        <div className="mb-3 grid size-9 place-items-center rounded-xl bg-blue-400/15 text-blue-200">
          <Users className="size-4" />
        </div>
        <p className="text-sm font-medium">Good chats start here</p>
        <p className="mt-1 text-xs leading-5 text-blue-100/60">
          Grow your circle and keep your favorite people close.
        </p>
      </div>
    </aside>
  );
}
