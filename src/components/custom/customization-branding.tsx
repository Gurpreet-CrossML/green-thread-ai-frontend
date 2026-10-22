"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import {
  IconPencil,
  IconPhoto,
  IconPhotoPlus,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { InfoIcon } from "@/components/custom/info-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const CKEditorTextArea = dynamic(
  () => import("@/components/custom/ckeditor-text-area"),
  {
    ssr: false,
  },
);

const GREETING_LIMIT = 180;

type CustomizationBrandingProps = {
  logoUrl: string | null;
  greetingMessage: string;
  /**
   * Whatever the server rejected, keyed by its own field names. Some rules
   * only it knows — the greeting's real length limit among them — so its
   * verdict has to land on the field rather than in a toast.
   */
  fieldErrors?: Record<string, string>;
  onGreetingChange: (value: string) => void;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
};

export default function CustomizationBranding({
  logoUrl,
  greetingMessage,
  fieldErrors,
  onGreetingChange,
  onLogoUpload,
  onRemoveLogo,
}: CustomizationBrandingProps) {
  const greetingLength = greetingMessage.trim().length;
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconPhotoPlus className="size-4" />
          Branding &amp; Messages
          <InfoIcon text="Your logo in the widget header, and the greeting the chat opens with." />
        </CardTitle>
        <CardDescription>
          The logo and messages customers see when they open the chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Field className="gap-2">
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="logo-upload">Chatbot Logo</FieldLabel>
            <FieldDescription>
              PNG, JPG, SVG, or WEBP, up to 2MB.
            </FieldDescription>
          </div>
          <input
            ref={logoInputRef}
            id="logo-upload"
            type="file"
            accept="image/*,.webp"
            className="hidden"
            onChange={onLogoUpload}
          />
          {/* Wrapper div: Field's vertical orientation stretches direct
              children to w-full; the tile must stay a fixed square. */}
          <div>
            {logoUrl ? (
              <div className="relative h-24 w-24">
                {/* Plain <img>: logoUrl may be a temporary blob: object URL,
                  which next/image does not support (same as the settings
                  page's company logo). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Chatbot logo"
                  className="h-24 w-24 rounded-md border bg-muted object-contain p-1"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label="Edit logo"
                      className="absolute -right-2 -top-2 size-7 rounded-full shadow"
                    >
                      <IconPencil className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={onRemoveLogo}>
                      <IconTrash />
                      Remove logo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => logoInputRef.current?.click()}
                    >
                      <IconPhoto />
                      Upload image
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                aria-label="Upload logo"
                className="flex h-24 w-24 items-center justify-center rounded-md border-2 border-dashed text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
              >
                <IconPlus className="size-6" />
              </button>
            )}
          </div>
        </Field>

        <Separator />

        <Field className="gap-2">
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="greeting-message">Greeting Message</FieldLabel>
            <FieldDescription>
              The first message the chatbot sends when the chat opens. It starts
              as the widget&apos;s own greeting: keep it unchanged and each
              visitor sees it in their language; edit it and everyone sees your
              text.
            </FieldDescription>
          </div>
          <CKEditorTextArea
            id="greeting-message"
            placeholder="Empty: the built-in greeting in the visitor's language"
            value={greetingMessage}
            useMarkdown
            onChange={onGreetingChange}
          />
          <div className="flex flex-col items-start gap-1">
            {/* Over the limit reads as an error before the server says so
                — the count is the rule, so it should look like one. */}
            <Typography
              variant="caption"
              className={cn(
                "order-2",
                greetingLength > GREETING_LIMIT && "text-destructive",
              )}
            >
              {greetingLength}/{GREETING_LIMIT} characters
            </Typography>
            {fieldErrors?.greeting_message ? (
              <Typography
                variant="caption"
                className="order-1 text-destructive"
              >
                {fieldErrors.greeting_message}
              </Typography>
            ) : null}
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}
