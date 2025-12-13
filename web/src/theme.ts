import { createSystem, defaultConfig, defineRecipe, defineSlotRecipe } from "@chakra-ui/react"

/**
 * Chakra v3 theme system (light-only).
 *
 * NOTE: Chakra v2-style `extendTheme({ components, styles })` is replaced by
 * v3's system config (`tokens`, `semanticTokens`, `globalCss`, recipes, etc.).
 *
 * For Step 3.1 we migrate tokens + semantic tokens + global body styles.
 * Component-level styling will be migrated later via recipes/slotRecipes.
 */
export const system = createSystem(defaultConfig, {
  globalCss: {
    body: {
      bg: "{colors.brand.100}",
      color: "{colors.text.main}",
    },
  },
  theme: {
    recipes: {
      button: defineRecipe({
        className: "chakra-button",
        base: {
          borderRadius: "lg",
          fontWeight: "semibold",
        },
        variants: {
          variant: {
            solid: {
              boxShadow: "md",
              transition: "all 0.2s",
              _hover: {
                transform: "translateY(-2px)",
                boxShadow: "lg",
              },
            },
            gradient: {
              bg: "accent.400",
              color: "white",
              borderRadius: "lg",
              fontWeight: "semibold",
              boxShadow: "sm",
              transition: "all 0.2s",
              _hover: {
                bg: "accent.500",
                boxShadow: "md",
              },
            },
          },
        },
      }),
      badge: defineRecipe({
        className: "chakra-badge",
        variants: {
          variant: {
            solid: {
              borderRadius: "full",
              px: "3",
              py: "1",
              fontWeight: "semibold",
              textTransform: "none",
            },
          },
        },
      }),
      heading: defineRecipe({
        className: "chakra-heading",
        base: {
          fontWeight: "bold",
          letterSpacing: "-0.02em",
        },
      }),
    },
    slotRecipes: {
      card: defineSlotRecipe({
        className: "chakra-card",
        slots: ["root", "header", "body", "footer", "title", "description"],
        base: {
          root: {
            borderRadius: "xl",
            boxShadow: "lg",
            borderWidth: "1px",
            borderColor: "gray.200",
            bg: "white",
            transition: "all 0.3s",
            _hover: {
              boxShadow: "xl",
              transform: "translateY(-2px)",
            },
          },
        },
        variants: {
          variant: {
            elevated: {
              root: {
                boxShadow: "xl",
                borderWidth: "0px",
              },
            },
            gradient: {
              root: {
                bg: "highlight.50",
                borderColor: "brand.200",
              },
            },
            academic: {
              root: {
                bg: "highlight.50",
                borderWidth: "1px",
                borderColor: "brand.200",
                boxShadow: "md",
              },
            },
          },
        },
      }),
      field: defineSlotRecipe({
        className: "chakra-field",
        slots: ["root", "label", "requiredIndicator", "helperText", "errorText"],
        base: {
          label: {
            color: "brand.700",
            fontWeight: "semibold",
          },
        },
      }),
      table: defineSlotRecipe({
        className: "chakra-table",
        slots: ["root", "header", "body", "footer", "row", "cell", "columnHeader", "caption"],
        variants: {
          variant: {
            simple: {
              columnHeader: {
                color: "brand.700",
                fontWeight: "semibold",
                textTransform: "none",
                letterSpacing: "normal",
                py: "2",
              },
              cell: {
                py: "2",
              },
            },
          },
        },
        defaultVariants: {
          variant: "simple",
        },
      }),
    },
    tokens: {
      colors: {
        // Nature-inspired green/olive color palette - Clean, organic, professional
        brand: {
          50: { value: "#F7FAF4" }, // header bg
          100: { value: "#F5F7F1" }, // page bg
          200: { value: "#E6EDD9" }, // light pill / tab bg
          300: { value: "#C9D9B5" },
          400: { value: "#A9C28F" },
          500: { value: "#8FAE75" }, // primary mid
          600: { value: "#6B8F58" },
          700: { value: "#4B612C" }, // primary dark
          800: { value: "#3F5424" }, // primary dark hover
          900: { value: "#2A3818" },
        },
        accent: {
          50: { value: "#F9FAF7" },
          100: { value: "#F0F3EB" },
          200: { value: "#E1E8D4" },
          300: { value: "#C8D6B3" },
          400: { value: "#A8BE8A" },
          500: { value: "#8FAE75" },
          600: { value: "#6B8F58" },
          700: { value: "#556F45" },
          800: { value: "#3F5234" },
          900: { value: "#2A3623" },
        },
        purple: {
          50: { value: "#FAF5FF" },
          100: { value: "#E9D8FD" },
          200: { value: "#D6BCFA" },
          300: { value: "#B794F4" },
          400: { value: "#9F7AEA" },
          500: { value: "#805AD5" },
          600: { value: "#6B46C1" },
          700: { value: "#553C9A" },
          800: { value: "#44337A" },
          900: { value: "#322659" },
        },
        orange: {
          50: { value: "#FFFAF0" },
          100: { value: "#FEEBC8" },
          200: { value: "#FBD38D" },
          300: { value: "#F6AD55" },
          400: { value: "#ED8936" },
          500: { value: "#DD6B20" },
          600: { value: "#C05621" },
          700: { value: "#9C4221" },
          800: { value: "#7C2D12" },
          900: { value: "#651A0B" },
        },
        success: {
          50: { value: "#F0FFF4" },
          100: { value: "#C6F6D5" },
          200: { value: "#9AE6B4" },
          300: { value: "#68D391" },
          400: { value: "#48BB78" },
          500: { value: "#38A169" },
          600: { value: "#2F855A" },
          700: { value: "#276749" },
          800: { value: "#22543D" },
          900: { value: "#1C4532" },
        },
        warning: {
          50: { value: "#FFFBEB" },
          100: { value: "#FEF3C7" },
          200: { value: "#FDE68A" },
          300: { value: "#FCD34D" },
          400: { value: "#FBBF24" },
          500: { value: "#F59E0B" },
          600: { value: "#D97706" },
          700: { value: "#B45309" },
          800: { value: "#92400E" },
          900: { value: "#78350F" },
        },
        error: {
          50: { value: "#FEF2F2" },
          100: { value: "#FEE2E2" },
          200: { value: "#FECACA" },
          300: { value: "#FCA5A5" },
          400: { value: "#F87171" },
          500: { value: "#EF4444" },
          600: { value: "#DC2626" },
          700: { value: "#B91C1C" },
          800: { value: "#991B1B" },
          900: { value: "#7F1D1D" },
        },
        gray: {
          50: { value: "#F7F9FA" }, // Neutral light
          100: { value: "#EDF2F7" },
          200: { value: "#E2E8F0" },
          300: { value: "#CBD5E0" },
          400: { value: "#A0AEC0" },
          500: { value: "#718096" },
          600: { value: "#4A5568" },
          700: { value: "#2D3748" },
          800: { value: "#1A202C" },
          900: { value: "#0F2C3A" }, // Neutral dark
        },
        highlight: {
          50: { value: "#F2F4EC" }, // section bg
          100: { value: "#E8EDE0" },
          200: { value: "#DDE5D0" },
          300: { value: "#D1DDC0" },
          400: { value: "#C6D5B0" },
          500: { value: "#F2F4EC" }, // Main highlight color
        },
        text: {
          main: { value: "#3D3D3D" },
          muted: { value: "#6B6B6B" },
          inverse: { value: "#FFFFFF" },
        },
        border: {
          default: { value: "#D8D8D8" },
        },
        surfaces: {
          card: { value: "#FFFFFF" },
          section: { value: "#F2F4EC" },
        },
      },
    },
    semanticTokens: {
      colors: {
        pageBg: { value: "{colors.brand.100}" },
        headerBg: { value: "{colors.brand.50}" },
        headerBorder: { value: "{colors.brand.700}" },
        primary: { value: "{colors.brand.500}" },
        primaryDark: { value: "{colors.brand.700}" },
        primaryLight: { value: "{colors.brand.200}" },
        sectionBg: { value: "{colors.surfaces.section}" },
        cardBg: { value: "{colors.surfaces.card}" },
        textMain: { value: "{colors.text.main}" },
        textMuted: { value: "{colors.text.muted}" },
        borderDefault: { value: "{colors.border.default}" },
      },
    },
  },
})

export default system
