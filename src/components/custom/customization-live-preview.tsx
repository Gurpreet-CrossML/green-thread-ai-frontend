"use client";

import ReactMarkdown from "react-markdown";
import {
  IconArrowsDiagonal,
  IconDeviceMobile,
  IconPaperclip,
  IconSend,
  IconX,
} from "@tabler/icons-react";

import { InfoIcon } from "@/components/custom/info-icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { darken } from "@/lib/color";

/** The tyre widget's built-in English greeting, used when none is set. */
export const TYRE_DEFAULT_GREETING =
  "👋 **Let's try to find suitable tires for your vehicle! Please tell us what vehicle do you have and what kind of tires are you looking for!**";

type CustomizationLivePreviewProps = {
  storeLabel: string;
  logoUrl: string | null;
  greetingMessage: string;
  /** Brand colour: header logo, the customer's bubbles, the send button. */
  primaryColor: string;
  /** The bot's message bubbles. */
  bubbleColor: string;
  /** Light surfaces, e.g. the message input. */
  surfaceColor: string;
};

/**
 * A static preview of the tyre chat widget with the chosen colours, logo and
 * greeting — laid out like the real widget (header, messages, input).
 */
export default function CustomizationLivePreview({
  storeLabel,
  logoUrl,
  greetingMessage,
  primaryColor,
  bubbleColor,
  surfaceColor,
}: CustomizationLivePreviewProps) {
  const accent = darken(primaryColor, 0.14);
  const greeting = greetingMessage.trim() || TYRE_DEFAULT_GREETING;

  return (
    <Card className="sticky top-4 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Live Chatbot Preview
          <InfoIcon text="How the tyre chat widget looks with these settings. Leave the greeting empty to use the widget's built-in greeting in the visitor's language." />
        </CardTitle>
        <CardDescription>
          Preview for <span className="text-foreground">{storeLabel}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-[#e3e8e5] bg-white text-[#1a1a1a] shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#e3e8e5] px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg text-sm font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${primaryColor})`,
                }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt=""
                    className="h-full w-full bg-white object-contain"
                  />
                ) : (
                  storeLabel.charAt(0).toUpperCase()
                )}
              </div>
              <div className="leading-tight">
                <div
                  className="text-[15px] font-semibold"
                  style={{ color: accent }}
                >
                  {storeLabel}
                </div>
                <div className="text-xs text-[#6b7280]">Support agent</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[#6b7280]">
              <IconArrowsDiagonal className="size-4" />
              <IconX className="size-4" />
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 text-sm">
            <div className="flex flex-col items-start gap-1">
              <div
                className="max-w-[85%] rounded-2xl px-3.5 py-2.5 [&_p]:m-0"
                style={{ background: bubbleColor }}
              >
                <ReactMarkdown>{greeting}</ReactMarkdown>
              </div>
              <span className="text-[11px] text-[#6b7280]">
                AI Agent • 15:20
              </span>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div
                className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-white"
                style={{ background: primaryColor }}
              >
                I need summer tyres for my 2019 Toyota Corolla
              </div>
              <span className="text-[11px] text-[#6b7280]">15:21 • User</span>
            </div>

            <div className="flex flex-col items-start gap-1">
              <div
                className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
                style={{ background: bubbleColor }}
              >
                I found the factory size for your Toyota Corolla 2019:{" "}
                <strong>205/55 R16</strong>. Shall I search for summer tyres in
                this size?
              </div>
              <span className="text-[11px] text-[#6b7280]">
                AI Agent • 15:21
              </span>
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-[#e3e8e5] p-3">
            <div
              className="rounded-2xl border border-[#e3e8e5] px-3 py-2.5"
              style={{ background: surfaceColor }}
            >
              <div className="pb-2 text-sm text-[#9ca3af]">Message...</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[#6b7280]">
                  <IconPaperclip className="size-4" />
                  <IconDeviceMobile className="size-4" />
                </div>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                  style={{ background: primaryColor }}
                >
                  <IconSend className="size-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
