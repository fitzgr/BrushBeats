import { OVERLAY_THEME_AUTO, resolveOverlayTheme } from "./overlayThemes";

function getPhase(ageEstimate) {
  return ageEstimate?.phase || "adult";
}

const AGE_UI_CONFIG = {
  infant: {
    cssVars: {
      "--panel": "linear-gradient(155deg, rgba(255, 252, 244, 0.98), rgba(238, 249, 255, 0.96))",
      "--surface": "#fffaf0",
      "--age-card-border": "rgba(92, 171, 214, 0.24)",
      "--age-header-gradient": "radial-gradient(circle at top right, rgba(255, 233, 149, 0.55), transparent 30%), radial-gradient(circle at left 20%, rgba(126, 214, 255, 0.35), transparent 35%), linear-gradient(140deg, rgba(212, 244, 255, 0.96), rgba(255, 245, 209, 0.94), rgba(255, 231, 238, 0.92))",
      "--age-routine-gradient": "linear-gradient(140deg, rgba(255, 249, 225, 0.98), rgba(237, 248, 255, 0.95))",
      "--age-profile-gradient": "linear-gradient(135deg, rgba(240, 251, 255, 0.96), rgba(255, 244, 202, 0.95), rgba(255, 230, 239, 0.92))",
      "--age-scale-gradient": "linear-gradient(180deg, rgba(255, 253, 245, 0.96), rgba(242, 251, 255, 0.92))",
      "--age-map-gradient": "radial-gradient(circle at 30% 18%, rgba(255, 232, 156, 0.22), transparent 20%), radial-gradient(circle at 76% 20%, rgba(128, 225, 255, 0.22), transparent 22%), radial-gradient(circle at 20% 82%, rgba(255, 195, 219, 0.18), transparent 18%), linear-gradient(180deg, #0c3159, #08192f 72%)",
      "--age-panel-glow": "rgba(102, 187, 255, 0.16)",
      "--age-chip-bg": "rgba(255, 241, 214, 0.96)",
      "--age-chip-border": "rgba(234, 127, 51, 0.26)",
      "--age-chip-text": "#8a4716",
      "--age-orbit-a": "rgba(255, 222, 120, 0.9)",
      "--age-orbit-b": "rgba(116, 218, 255, 0.88)",
      "--age-orbit-c": "rgba(255, 184, 214, 0.84)"
    },
    chips: ["Bubble trails", "Story cues", "Sticker rewards"],
    decorations: ["bubble", "trail", "spark"],
    content: {
      hero: {
        eyebrow: "Tiny explorer mode",
        title: "Soft storybook brushing",
        body: "This stage leans into floating bubbles, bright stickers, and gentle prompts so early brushing feels light instead of clinical."
      },
      spotlight: {
        eyebrow: "Age-driven UI",
        title: "Bubble parade tempo lab",
        body: "Controls stay readable, but the visuals shift playful and warm to hold attention for very young brushers."
      },
      guide: {
        eyebrow: "Brush map overlay",
        title: "Follow the bubble trail",
        body: "The brush map can feel more like a mini game with floating color cues and soft reward energy."
      }
    }
  },
  toddler: {
    cssVars: {
      "--panel": "linear-gradient(155deg, rgba(255, 251, 240, 0.98), rgba(242, 249, 255, 0.96))",
      "--surface": "#fffaf1",
      "--age-card-border": "rgba(74, 152, 199, 0.24)",
      "--age-header-gradient": "radial-gradient(circle at 82% 18%, rgba(255, 214, 104, 0.52), transparent 28%), radial-gradient(circle at 15% 24%, rgba(119, 225, 255, 0.34), transparent 28%), linear-gradient(140deg, rgba(219, 246, 255, 0.96), rgba(255, 241, 193, 0.94), rgba(255, 232, 243, 0.92))",
      "--age-routine-gradient": "linear-gradient(135deg, rgba(255, 248, 216, 0.98), rgba(233, 247, 255, 0.95))",
      "--age-profile-gradient": "linear-gradient(140deg, rgba(238, 250, 255, 0.96), rgba(255, 239, 202, 0.94), rgba(255, 236, 245, 0.9))",
      "--age-scale-gradient": "linear-gradient(180deg, rgba(255, 252, 237, 0.96), rgba(240, 249, 255, 0.93))",
      "--age-map-gradient": "radial-gradient(circle at 18% 22%, rgba(255, 228, 140, 0.24), transparent 18%), radial-gradient(circle at 75% 18%, rgba(111, 222, 255, 0.22), transparent 20%), radial-gradient(circle at 80% 78%, rgba(255, 176, 206, 0.18), transparent 16%), linear-gradient(180deg, #123662, #08192f 72%)",
      "--age-panel-glow": "rgba(255, 183, 0, 0.14)",
      "--age-chip-bg": "rgba(255, 244, 216, 0.96)",
      "--age-chip-border": "rgba(226, 138, 53, 0.26)",
      "--age-chip-text": "#8b4b1c",
      "--age-orbit-a": "rgba(255, 213, 102, 0.92)",
      "--age-orbit-b": "rgba(92, 214, 255, 0.88)",
      "--age-orbit-c": "rgba(255, 162, 198, 0.82)"
    },
    chips: ["Rainbow prompts", "Color bursts", "Friendly badges"],
    decorations: ["burst", "trail", "shine"],
    content: {
      hero: {
        eyebrow: "Color burst mode",
        title: "High-energy, toddler-friendly brushing",
        body: "This stage gets louder color, chunkier prompts, and upbeat reward surfaces that keep the routine playful and obvious."
      },
      spotlight: {
        eyebrow: "Age-driven UI",
        title: "Color-pop tempo lab",
        body: "Young brushers get bolder contrast and easier visual targets so the flow feels more like play than setup."
      },
      guide: {
        eyebrow: "Brush map overlay",
        title: "Catch the color spark",
        body: "The guide can reward each movement with brighter motion cues and cheerful overlay energy."
      }
    }
  },
  primary: {
    cssVars: {
      "--panel": "linear-gradient(155deg, rgba(252, 251, 242, 0.98), rgba(236, 247, 255, 0.96))",
      "--surface": "#fffbf2",
      "--age-card-border": "rgba(76, 125, 195, 0.22)",
      "--age-header-gradient": "linear-gradient(130deg, rgba(204, 240, 255, 0.88), rgba(255, 250, 229, 0.92))",
      "--age-routine-gradient": "linear-gradient(135deg, rgba(248, 252, 228, 0.98), rgba(230, 244, 255, 0.94))",
      "--age-profile-gradient": "linear-gradient(130deg, rgba(225, 245, 255, 0.94), rgba(255, 247, 223, 0.94))",
      "--age-scale-gradient": "linear-gradient(180deg, rgba(248, 251, 232, 0.95), rgba(238, 247, 255, 0.92))",
      "--age-map-gradient": "radial-gradient(circle at 15% 18%, rgba(140, 233, 255, 0.18), transparent 18%), radial-gradient(circle at 84% 22%, rgba(255, 226, 123, 0.2), transparent 18%), linear-gradient(180deg, #103868, #08192f 72%)",
      "--age-panel-glow": "rgba(60, 120, 220, 0.14)",
      "--age-chip-bg": "rgba(232, 245, 255, 0.96)",
      "--age-chip-border": "rgba(62, 113, 188, 0.24)",
      "--age-chip-text": "#23528a",
      "--age-orbit-a": "rgba(255, 214, 105, 0.88)",
      "--age-orbit-b": "rgba(102, 203, 255, 0.88)",
      "--age-orbit-c": "rgba(176, 232, 126, 0.84)"
    },
    chips: ["Quest cues", "Arcade glow", "Level-up energy"],
    decorations: ["quest", "combo", "boost"],
    content: {
      hero: {
        eyebrow: "Quest mode",
        title: "Brushing with playful momentum",
        body: "This stage shifts toward a kid-forward quest look with brighter gradients, game-like prompts, and progress-first surfaces."
      },
      spotlight: {
        eyebrow: "Age-driven UI",
        title: "Questboard tempo lab",
        body: "Primary-age brushing can carry more motion and challenge language without losing clarity for setup and care guidance."
      },
      guide: {
        eyebrow: "Brush map overlay",
        title: "Complete the sparkle route",
        body: "The guide can feel like a route map, with each tooth movement feeding a visible little mission."
      }
    }
  },
  mixed: {
    cssVars: {
      "--panel": "linear-gradient(155deg, rgba(251, 251, 246, 0.98), rgba(239, 247, 251, 0.96))",
      "--surface": "#fffdf8",
      "--age-card-border": "rgba(74, 125, 145, 0.2)",
      "--age-header-gradient": "linear-gradient(130deg, rgba(214, 239, 244, 0.9), rgba(255, 248, 235, 0.92))",
      "--age-routine-gradient": "linear-gradient(135deg, rgba(248, 249, 242, 0.98), rgba(236, 245, 249, 0.94))",
      "--age-profile-gradient": "linear-gradient(130deg, rgba(227, 241, 247, 0.94), rgba(255, 248, 235, 0.92))",
      "--age-scale-gradient": "linear-gradient(180deg, rgba(248, 249, 243, 0.95), rgba(236, 245, 249, 0.92))",
      "--age-map-gradient": "radial-gradient(circle at 78% 20%, rgba(147, 216, 255, 0.16), transparent 18%), linear-gradient(180deg, #13324f, #08192f 72%)",
      "--age-panel-glow": "rgba(83, 149, 170, 0.12)",
      "--age-chip-bg": "rgba(239, 247, 250, 0.94)",
      "--age-chip-border": "rgba(70, 123, 143, 0.2)",
      "--age-chip-text": "#2f596b",
      "--age-orbit-a": "rgba(126, 210, 240, 0.84)",
      "--age-orbit-b": "rgba(255, 216, 145, 0.84)",
      "--age-orbit-c": "rgba(192, 230, 183, 0.78)"
    },
    chips: ["Clean focus", "Progress energy", "Lighter gamification"],
    decorations: ["focus", "pulse", "path"],
    content: {
      hero: {
        eyebrow: "Momentum mode",
        title: "Balanced guidance with some game energy",
        body: "This stage keeps the UI a bit more mature, but still gives progress cues and layered visuals to keep the routine engaging."
      },
      spotlight: {
        eyebrow: "Age-driven UI",
        title: "Momentum tempo lab",
        body: "The interface stays cleaner here, with less sticker energy and more structured progress language."
      },
      guide: {
        eyebrow: "Brush map overlay",
        title: "Track the next move",
        body: "The map overlay becomes more directional, with cleaner path cues and less visual noise."
      }
    }
  },
  adult: {
    cssVars: {
      "--panel": "#fffdf8",
      "--surface": "#fff9ef",
      "--age-card-border": "rgba(16, 33, 37, 0.15)",
      "--age-header-gradient": "linear-gradient(130deg, rgba(184, 219, 229, 0.8), rgba(255, 249, 239, 0.9))",
      "--age-routine-gradient": "linear-gradient(135deg, rgba(255, 252, 246, 0.96), rgba(243, 239, 231, 0.94))",
      "--age-profile-gradient": "linear-gradient(130deg, rgba(223, 241, 255, 0.9), rgba(255, 249, 239, 0.92))",
      "--age-scale-gradient": "rgba(16, 33, 37, 0.04)",
      "--age-map-gradient": "radial-gradient(circle at 30% 20%, #032047, #051635 70%)",
      "--age-panel-glow": "rgba(16, 33, 37, 0.08)",
      "--age-chip-bg": "rgba(255, 255, 255, 0.9)",
      "--age-chip-border": "rgba(16, 33, 37, 0.18)",
      "--age-chip-text": "#33484e",
      "--age-orbit-a": "rgba(184, 219, 229, 0.82)",
      "--age-orbit-b": "rgba(247, 223, 201, 0.84)",
      "--age-orbit-c": "rgba(183, 224, 197, 0.8)"
    },
    chips: ["Calm guidance", "Clear progress", "Low-noise overlays"],
    decorations: ["focus", "calm", "steady"],
    content: {
      hero: {
        eyebrow: "Calm guidance mode",
        title: "Structured, low-noise brushing UI",
        body: "Older brushers keep a cleaner interface with subtler overlays, clearer structure, and less toy-like visual pressure."
      },
      spotlight: {
        eyebrow: "Age-driven UI",
        title: "Calm tempo lab",
        body: "The UI stays focused here, using restrained visuals and lightweight overlays instead of heavy gamification."
      },
      guide: {
        eyebrow: "Brush map overlay",
        title: "Follow the next clean pass",
        body: "The guide stays direct, with enough visual structure to keep the route obvious without overplaying the routine."
      }
    }
  }
};

function translateContent(t, phase, profileConfig, variant, values) {
  const content = profileConfig.content[variant];

  return {
    eyebrow: t(`ageUi.${phase}.${variant}.eyebrow`, { defaultValue: content.eyebrow, ...values }),
    title: t(`ageUi.${phase}.${variant}.title`, { defaultValue: content.title, ...values }),
    body: t(`ageUi.${phase}.${variant}.body`, { defaultValue: content.body, ...values })
  };
}

export function buildAgeUiProfile(t, ageEstimate, options = {}) {
  const phase = getPhase(ageEstimate);
  const profileConfig = AGE_UI_CONFIG[phase] || AGE_UI_CONFIG.adult;
  const overlayTheme = resolveOverlayTheme({
    ageGroup: phase,
    themeId: options.overlayTheme || OVERLAY_THEME_AUTO
  });
  const stageLabel = options.stageLabel || "Detected stage";
  const ageText = options.ageText || "";
  const values = { stageLabel, ageText };

  return {
    phase,
    themeClassName: `age-ui-${phase}`,
    shellClassName: `age-theme-${phase}`,
    cssVars: { ...profileConfig.cssVars },
    stageLabel,
    ageText,
    simulated: Boolean(options.simulated),
    overlayThemeId: overlayTheme?.id || null,
    overlayThemeLabel: overlayTheme?.label || null,
    metaChips: [
      stageLabel,
      ageText,
      phase !== "adult" && overlayTheme?.label
        ? t("settings.experienceSimulator.themeChip", { defaultValue: "Overlay: {{label}}", label: overlayTheme.label })
        : null,
      options.simulated
        ? t("ageUi.meta.simulated", { defaultValue: "Simulation active" })
        : t("ageUi.meta.detected", { defaultValue: "Tooth-based stage" })
    ].filter(Boolean),
    chips: profileConfig.chips.map((chip, index) => t(`ageUi.${phase}.chips.${index + 1}`, { defaultValue: chip, ...values })),
    decorations: profileConfig.decorations.map((label, index) => ({
      id: `${phase}-${index + 1}`,
      label: t(`ageUi.${phase}.decorations.${index + 1}`, { defaultValue: label, ...values }),
      orbitClassName: `orbit-${index + 1}`
    })),
    content: {
      hero: translateContent(t, phase, profileConfig, "hero", values),
      spotlight: translateContent(t, phase, profileConfig, "spotlight", values),
      guide: translateContent(t, phase, profileConfig, "guide", values)
    }
  };
}

export function resolveAgeUiPhase(ageEstimate) {
  return getPhase(ageEstimate);
}