"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SmilePlus } from "lucide-react";

import { Button } from "@/components/ui/button";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

interface MessageReactionPickerProps {
  onSelect: (emoji: string) => void;
}

interface PickerPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function MessageReactionPicker({
  onSelect,
}: MessageReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PickerPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const button = buttonRef.current;

    if (!button) {
      setIsOpen(false);
      return;
    }

    const buttonRect = button.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(320, window.innerWidth - margin * 2);
    const height = Math.min(360, window.innerHeight - margin * 2);

    const left = Math.min(
      Math.max(margin, buttonRect.right - width),
      window.innerWidth - width - margin,
    );

    const spaceAbove = buttonRect.top - margin;
    const spaceBelow = window.innerHeight - buttonRect.bottom - margin;

    let top: number;

    if (spaceAbove >= height) {
      top = buttonRect.top - height - margin;
    } else if (spaceBelow >= height) {
      top = buttonRect.bottom + margin;
    } else {
      top = Math.min(
        Math.max(margin, buttonRect.top - height / 2),
        window.innerHeight - height - margin,
      );
    }

    setPosition({ top, left, width, height });

    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        !buttonRef.current?.contains(target) &&
        !pickerRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setPosition(null);
      }
    }

    function handleScroll(event: Event) {
      const target = event.target;

      // Picker ke andar category/emoji list scroll ho toh open rehne do.
      if (target instanceof Node && pickerRef.current?.contains(target)) {
        return;
      }

      // Chat ya page scroll ho toh close karo.
      setIsOpen(false);
      setPosition(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setPosition(null);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Add reaction"
        title="Add reaction"
        aria-expanded={isOpen}
        onClick={() => {
          setPosition(null);
          setIsOpen((open) => !open);
        }}
        className="size-7 text-muted-foreground hover:text-primary"
      >
        <SmilePlus className="size-3.5" />
      </Button>

      {isOpen && position
        ? createPortal(
            <div
              ref={pickerRef}
              className="z-[100] overflow-hidden rounded-xl border bg-background shadow-xl"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
              }}
            >
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  onSelect(emojiData.emoji);
                  setIsOpen(false);
                  setPosition(null);
                }}
                width={position.width}
                height={position.height}
                lazyLoadEmojis
                searchPlaceholder="Search emoji"
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
