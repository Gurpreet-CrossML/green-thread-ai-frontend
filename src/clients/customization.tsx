"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormik } from "formik";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  FetchWidgetCustomization,
  UpdateWidgetCustomization,
  UpdateWidgetCustomizationWithImage,
  type UpdateWidgetCustomizationPayload,
  type WidgetCustomizationDataResponse,
  type WidgetQuickAction,
  type WidgetQuickLink,
} from "@/redux/api-slice/customization-slice";
import { darken, getReadableText, mix, normalizeHex } from "@/lib/color";
import { isValidUrl, normalizeUrl } from "@/lib/url";
import {
  applyServerFieldErrors,
  formikErrorsFromZod,
} from "@/lib/form-errors";
import CustomizationTheme from "@/components/custom/customization-theme";
import CustomizationBranding from "@/components/custom/customization-branding";
import CustomizationLivePreview from "@/components/custom/customization-live-preview";
import type {
  ActionButton,
  ColorKey,
  QuickLinkItem,
} from "@/components/custom/customization-types";

// The tyre widget's built-in look: brand green, bot bubble and surface colours.
const DEFAULT_PRIMARY = "#03a800";
const DEFAULT_SECONDARY = "#eaf1ed";
const DEFAULT_TERTIARY = "#f5f8f6";
const DEFAULT_WELCOME = "What are you shopping for today?";
// The tyre widget's built-in greeting, per language (its i18n.ts). Saving it
// unchanged stores no greeting, so the widget keeps showing it in each
// visitor's own language; an edited greeting is shown to everyone as written.
const TYRE_GREETINGS: Record<string, string> = {
  en: "👋 **Let's try to find suitable tires for your vehicle! Please tell us what vehicle do you have and what kind of tires are you looking for!**",
  fi: "👋 **Etsitään autoosi sopivat renkaat. Anna minulle ajoneuvosi tiedot ja minkälaisia renkaita etsit!**",
  et: "👋 **Leiame teie sõidukile sobivad rehvid! Palun öelge, milline sõiduk teil on ja milliseid rehve otsite!**",
  ru: "👋 **Давайте подберём подходящие шины для вашего автомобиля! Пожалуйста, укажите, какой у вас автомобиль и какие шины вы ищете!**",
};
const DEFAULT_GREETING = TYRE_GREETINGS.en;

type CustomizationFormValues = {
  welcome_message: string;
  greeting_message: string;
  quick_links: { name: string; url: string }[];
  quick_actions: ActionButton[];
};

const customizationValidationSchema = z
  .object({
    welcome_message: z.string(),
    greeting_message: z.string(),
    quick_links: z.array(
      z.object({
        name: z.string(),
        url: z.string(),
      }),
    ),
    quick_actions: z.array(
      z.object({
        id: z.number().optional(),
        name: z
          .string()
          .trim()
          .min(1, "Name is required.")
          .regex(
            /^[a-zA-Z\s\-'&]+$/,
            "Only letters, spaces, apostrophes, hyphens, and ampersand are allowed.",
          ),
        message: z.string().trim().min(1, "Message is required."),
      }),
    ),
  })
  .superRefine((values, ctx) => {
    const seenNames = new Set<string>();
    values.quick_links.forEach((link, index) => {
      const name = link.name.trim().toLowerCase();
      if (!name && link.url.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["quick_links", index, "name"],
          message: "Name is required.",
        });
      }
      if (name && seenNames.has(name)) {
        ctx.addIssue({
          code: "custom",
          path: ["quick_links", index, "name"],
          message: "Duplicate name",
        });
      }
      if (name) seenNames.add(name);
      if (link.url && !isValidUrl(link.url)) {
        ctx.addIssue({
          code: "custom",
          path: ["quick_links", index, "url"],
          message: "Enter a valid URL",
        });
      }
    });
  });

const customizationErrorsFromZod = (values: CustomizationFormValues) => {
  const result = customizationValidationSchema.safeParse(values);
  const errors = result.success
    ? {}
    : (formikErrorsFromZod(result.error.issues) as Record<string, unknown>);
  const rowErrors =
    "quick_links" in errors && Array.isArray(errors.quick_links)
      ? (errors.quick_links as Record<string, string>[])
      : [];
  return { errors, rowErrors };
};

export default function Customization() {
  const dispatch = useAppDispatch();
  const storeCode = useAppSelector(
    (state) => state.GetStoresReducer.selectedStore,
  );
  const stores = useAppSelector(
    (state) => state.GetStoresReducer.GetStoresState.GetStoresListData,
  );

  const store = stores.find((item) => item.code === storeCode);
  const storeId = store ? Number(store.id) : null;
  const storeLabel = store?.name ?? "Selected store";
  // The tyre widget's own greeting in this store's language.
  const builtInGreeting =
    TYRE_GREETINGS[store?.default_language ?? ""] ?? DEFAULT_GREETING;

  const [savingAll, setSavingAll] = useState(false);

  const [themeColor, setThemeColor] = useState(DEFAULT_PRIMARY);
  const [themeHexInput, setThemeHexInput] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [secondaryHexInput, setSecondaryHexInput] = useState(DEFAULT_SECONDARY);
  const [tertiaryColor, setTertiaryColor] = useState(DEFAULT_TERTIARY);
  const [tertiaryHexInput, setTertiaryHexInput] = useState(DEFAULT_TERTIARY);

  const [greetingMessage, setGreetingMessage] = useState(DEFAULT_GREETING);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoObjectUrlRef = useRef<string | null>(null);

  const [actionButtons, setActionButtons] = useState<ActionButton[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLinkItem[]>([]);
  const formik = useFormik<CustomizationFormValues>({
    initialValues: {
      welcome_message: DEFAULT_WELCOME,
      greeting_message: DEFAULT_GREETING,
      quick_links: [],
      quick_actions: [],
    },
    enableReinitialize: true,
    validate: (values) => customizationErrorsFromZod(values).errors,
    onSubmit: async (values) => {
      if (storeId == null) return;

      const quickActions: WidgetQuickAction[] = actionButtons.map((button) => ({
        ...(button.id != null ? { id: button.id } : {}),
        name: button.name,
        message: button.message,
      }));
      const quickLinksPayload: WidgetQuickLink[] = normalizedQuickLinks.map(
        (link) => ({
          ...(link.id != null ? { id: link.id } : {}),
          name: link.label.trim(),
          url: normalizeUrl(link.url),
          priority: link.priority,
          is_active: link.active,
        }),
      );

      const payload: UpdateWidgetCustomizationPayload = {
        store: storeId,
        primary_color: themeColor,
        secondary_color: secondaryColor,
        tertiary_color: tertiaryColor,
        welcome_message: values.welcome_message,
        // Unchanged built-in greeting: store none, so the widget keeps
        // translating it for each visitor.
        greeting_message:
          values.greeting_message.trim() === builtInGreeting.trim()
            ? ""
            : values.greeting_message.trim(),
        quick_actions: quickActions,
        quick_links: quickLinksPayload,
      };

      setSavingAll(true);
      formik.setErrors({});
      try {
        let result;
        if (logoFile) {
          result = await dispatch(
            UpdateWidgetCustomizationWithImage({ storeId, payload, logoFile }),
          );
        } else {
          if (!logoUrl) {
            payload.logo = null;
          }
          result = await dispatch(
            UpdateWidgetCustomization({ storeId, payload }),
          );
        }

        const fulfilled =
          UpdateWidgetCustomization.fulfilled.match(result) ||
          UpdateWidgetCustomizationWithImage.fulfilled.match(result);

        if (fulfilled) {
          formik.resetForm({ values });
          populate(result.payload as WidgetCustomizationDataResponse);
        } else {
          applyServerFieldErrors(formik, result.payload);
        }
      } finally {
        setSavingAll(false);
      }
    },
  });

  const fieldErrors = formik.errors as Record<string, string>;

  const applyColor = (which: ColorKey, value: string) => {
    const normalized = normalizeHex(value) ?? value;
    if (which === "primary") {
      setThemeColor(normalized);
      setThemeHexInput(normalized);
    } else if (which === "secondary") {
      setSecondaryColor(normalized);
      setSecondaryHexInput(normalized);
    } else {
      setTertiaryColor(normalized);
      setTertiaryHexInput(normalized);
    }
  };

  const handleHexChange = (which: ColorKey, raw: string) => {
    const withHash = raw.startsWith("#") ? raw : `#${raw}`;
    if (which === "primary") setThemeHexInput(withHash);
    else if (which === "secondary") setSecondaryHexInput(withHash);
    else setTertiaryHexInput(withHash);
    const normalized = normalizeHex(withHash);
    if (normalized) applyColor(which, normalized);
  };

  const revokeLogoObjectUrl = () => {
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
  };

  const populate = (data: WidgetCustomizationDataResponse | null) => {
    revokeLogoObjectUrl();
    setLogoFile(null);

    if (!data) {
      applyColor("primary", DEFAULT_PRIMARY);
      applyColor("secondary", DEFAULT_SECONDARY);
      applyColor("tertiary", DEFAULT_TERTIARY);
      setGreetingMessage(builtInGreeting);
      setLogoUrl(null);
      setActionButtons([]);
      setQuickLinks([]);
      formik.setValues({
        welcome_message: DEFAULT_WELCOME,
        greeting_message: builtInGreeting,
        quick_links: [],
        quick_actions: [],
      });
      return;
    }

    applyColor("primary", data.primary_color ?? DEFAULT_PRIMARY);
    applyColor("secondary", data.secondary_color ?? DEFAULT_SECONDARY);
    applyColor("tertiary", data.tertiary_color ?? DEFAULT_TERTIARY);
    const nextWelcome = data.welcome_message || DEFAULT_WELCOME;
    const nextGreeting = data.greeting_message?.trim()
      ? data.greeting_message
      : builtInGreeting;
    const nextActionButtons = (data.quick_actions ?? []).map((action) => ({
      id: action.id,
      name: action.name,
      message: action.message,
    }));
    const nextQuickLinks = (data.quick_links ?? []).map((link) => ({
      id: link.id,
      label: link.name,
      url: link.url,
      priority: link.priority,
      active: link.is_active,
    }));
    setGreetingMessage(nextGreeting);
    setLogoUrl(data.logo?.trim() ? data.logo : null);
    setActionButtons(nextActionButtons);
    setQuickLinks(nextQuickLinks);
    formik.setValues({
      welcome_message: nextWelcome,
      greeting_message: nextGreeting,
      quick_actions: nextActionButtons,
      quick_links: nextQuickLinks.map((link) => ({
        name: link.label,
        url: link.url,
      })),
    });
  };

  useEffect(() => {
    if (storeId == null) return;
    let active = true;
    (async () => {
      const result = await dispatch(FetchWidgetCustomization(storeId));
      if (!active) return;
      if (FetchWidgetCustomization.fulfilled.match(result)) {
        populate(result.payload as WidgetCustomizationDataResponse | null);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, storeId]);

  // Revoke any outstanding object URL on unmount.
  useEffect(() => () => revokeLogoObjectUrl(), []);

  const themeVars = useMemo(() => {
    const primary = normalizeHex(themeColor) ?? DEFAULT_PRIMARY;
    const secondary = normalizeHex(secondaryColor) ?? DEFAULT_SECONDARY;
    const tertiary = normalizeHex(tertiaryColor) ?? DEFAULT_TERTIARY;
    return {
      "--cb-primary": primary,
      "--cb-primary-dark": darken(primary, 0.14),
      "--cb-shell": mix(primary, "#ffffff", 0.92),
      "--cb-icon-bg": mix(primary, "#ffffff", 0.8),
      "--cb-hover-bg": mix(primary, "#ffffff", 0.93),
      "--cb-header-text": getReadableText(primary),
      "--cb-secondary": secondary,
      "--cb-tertiary": tertiary,
    } as React.CSSProperties;
  }, [themeColor, secondaryColor, tertiaryColor]);

  /** Drops one key out of `fieldErrors` — used to clear a stale server/local
   *  rejection the moment the user edits the field it was attached to. */
  const clearFieldError = (key: string) => {
    if (!(key in formik.errors)) return;
    const next = { ...formik.errors };
    delete next[key as keyof typeof next];
    formik.setErrors(next);
  };

  const handleGreetingChange = (value: string) => {
    setGreetingMessage(value);
    formik.setFieldValue("greeting_message", value, false);
    clearFieldError("greeting_message");
  };

  const normalizedQuickLinks = quickLinks
    .map((link, index) => ({
      ...link,
      label: link.label ?? "",
      url: link.url ?? "",
      priority:
        Number.isFinite(link.priority) && link.priority > 0
          ? link.priority
          : index + 1,
      active: typeof link.active === "boolean" ? link.active : true,
    }))
    .filter((link) => link.label.trim().length > 0);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file", {
        description: "Please upload a valid image (PNG, JPG, SVG, WEBP).",
      });
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large", {
        description: "Please upload an image smaller than 2MB.",
      });
      event.target.value = "";
      return;
    }

    revokeLogoObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    logoObjectUrlRef.current = objectUrl;
    setLogoFile(file);
    setLogoUrl(objectUrl);
  };

  const removeLogo = () => {
    revokeLogoObjectUrl();
    setLogoFile(null);
    setLogoUrl(null);
  };

  return (
    <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col gap-6">
        <CustomizationTheme
          fieldErrors={fieldErrors}
          themeColor={themeColor}
          themeHexInput={themeHexInput}
          secondaryColor={secondaryColor}
          secondaryHexInput={secondaryHexInput}
          tertiaryColor={tertiaryColor}
          tertiaryHexInput={tertiaryHexInput}
          themeVars={themeVars}
          applyColor={applyColor}
          handleHexChange={handleHexChange}
        />
        <CustomizationBranding
          fieldErrors={fieldErrors}
          logoUrl={logoUrl}
          greetingMessage={greetingMessage}
          onGreetingChange={handleGreetingChange}
          onLogoUpload={handleLogoUpload}
          onRemoveLogo={removeLogo}
        />
        <div className="flex justify-start border-t border-border py-3">
          <Button
            type="button"
            size="lg"
            onClick={() => formik.handleSubmit()}
            disabled={savingAll}
          >
            {savingAll ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <IconDeviceFloppy data-icon="inline-start" />
            )}
            {savingAll ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="relative">
        <CustomizationLivePreview
          storeLabel={storeLabel}
          logoUrl={logoUrl}
          greetingMessage={greetingMessage}
          primaryColor={normalizeHex(themeColor) ?? DEFAULT_PRIMARY}
          bubbleColor={normalizeHex(secondaryColor) ?? DEFAULT_SECONDARY}
          surfaceColor={normalizeHex(tertiaryColor) ?? DEFAULT_TERTIARY}
        />
      </div>
    </div>
  );
}
