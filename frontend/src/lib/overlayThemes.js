export const OVERLAY_THEME_AUTO = "auto";

const SELECTABLE_THEME_LIBRARY = {
	"space-explorers": {
		id: "space-explorers",
		label: "Space Explorers",
		pattern: "orbits",
		celebration: "stardust",
		colors: {
			bgPrimary: "rgba(7, 24, 68, 0.82)",
			bgSecondary: "rgba(51, 114, 214, 0.3)",
			glow: "rgba(123, 196, 255, 0.26)",
			accent: "#f7d46a",
			accentSoft: "rgba(247, 212, 106, 0.26)",
			edge: "rgba(143, 212, 255, 0.4)",
			pattern: "rgba(168, 219, 255, 0.24)",
			chip: "rgba(15, 44, 104, 0.82)",
			chipText: "#eff8ff"
		},
		assets: [
			{ x: "8%", y: "12%", size: "48px", label: "rocket", shortLabel: "RK", kind: "rocket", motion: "orbit" },
			{ x: "80%", y: "10%", size: "40px", label: "planet pal", shortLabel: "PL", kind: "planet", motion: "bob" },
			{ x: "13%", y: "76%", size: "38px", label: "star bot", shortLabel: "SB", kind: "bot", motion: "float" },
			{ x: "82%", y: "70%", size: "44px", label: "moon map", shortLabel: "MM", kind: "badge", motion: "drift" }
		]
	},
	"underwater-adventure": {
		id: "underwater-adventure",
		label: "Underwater Adventure",
		pattern: "waves",
		celebration: "bubbles",
		colors: {
			bgPrimary: "rgba(4, 58, 94, 0.78)",
			bgSecondary: "rgba(25, 157, 202, 0.28)",
			glow: "rgba(100, 231, 255, 0.22)",
			accent: "#89f0ff",
			accentSoft: "rgba(137, 240, 255, 0.22)",
			edge: "rgba(140, 246, 255, 0.34)",
			pattern: "rgba(133, 244, 255, 0.18)",
			chip: "rgba(7, 74, 106, 0.82)",
			chipText: "#ecffff"
		},
		assets: [
			{ x: "10%", y: "18%", size: "44px", label: "reef pal", shortLabel: "RF", kind: "leaf", motion: "sway" },
			{ x: "79%", y: "12%", size: "38px", label: "sub", shortLabel: "SB", kind: "capsule", motion: "bob" },
			{ x: "14%", y: "78%", size: "40px", label: "fish scout", shortLabel: "FS", kind: "fish", motion: "drift" },
			{ x: "84%", y: "72%", size: "46px", label: "pearl bot", shortLabel: "PB", kind: "bot", motion: "float" }
		]
	},
	"jungle-safari": {
		id: "jungle-safari",
		label: "Jungle Safari",
		pattern: "leaves",
		celebration: "confetti",
		colors: {
			bgPrimary: "rgba(25, 74, 38, 0.78)",
			bgSecondary: "rgba(111, 171, 58, 0.28)",
			glow: "rgba(177, 235, 124, 0.22)",
			accent: "#ffd06e",
			accentSoft: "rgba(255, 208, 110, 0.22)",
			edge: "rgba(197, 242, 130, 0.32)",
			pattern: "rgba(195, 243, 145, 0.18)",
			chip: "rgba(32, 83, 39, 0.82)",
			chipText: "#f4ffe9"
		},
		assets: [
			{ x: "9%", y: "13%", size: "46px", label: "trail jeep", shortLabel: "TJ", kind: "capsule", motion: "drift" },
			{ x: "80%", y: "15%", size: "40px", label: "lion pal", shortLabel: "LP", kind: "badge", motion: "bob" },
			{ x: "15%", y: "76%", size: "42px", label: "leaf guide", shortLabel: "LG", kind: "leaf", motion: "sway" },
			{ x: "83%", y: "70%", size: "38px", label: "drum beat", shortLabel: "DB", kind: "star", motion: "float" }
		]
	},
	"magical-kingdom": {
		id: "magical-kingdom",
		label: "Magical Kingdom",
		pattern: "crowns",
		celebration: "sparkles",
		colors: {
			bgPrimary: "rgba(77, 47, 119, 0.8)",
			bgSecondary: "rgba(211, 143, 255, 0.24)",
			glow: "rgba(255, 214, 126, 0.2)",
			accent: "#ffd89a",
			accentSoft: "rgba(255, 216, 154, 0.26)",
			edge: "rgba(236, 198, 255, 0.34)",
			pattern: "rgba(248, 223, 172, 0.2)",
			chip: "rgba(97, 61, 142, 0.82)",
			chipText: "#fff8ee"
		},
		assets: [
			{ x: "11%", y: "14%", size: "46px", label: "castle pal", shortLabel: "CP", kind: "tower", motion: "float" },
			{ x: "80%", y: "11%", size: "38px", label: "wand", shortLabel: "WD", kind: "star", motion: "orbit" },
			{ x: "13%", y: "77%", size: "40px", label: "shield", shortLabel: "SH", kind: "badge", motion: "bob" },
			{ x: "82%", y: "72%", size: "44px", label: "dragon pal", shortLabel: "DP", kind: "bot", motion: "drift" }
		]
	},
	"fairy-garden": {
		id: "fairy-garden",
		label: "Fairy Garden",
		pattern: "petals",
		celebration: "sparkles",
		colors: {
			bgPrimary: "rgba(62, 104, 70, 0.78)",
			bgSecondary: "rgba(255, 177, 205, 0.24)",
			glow: "rgba(255, 220, 167, 0.2)",
			accent: "#ffd995",
			accentSoft: "rgba(255, 217, 149, 0.24)",
			edge: "rgba(255, 201, 219, 0.32)",
			pattern: "rgba(255, 212, 230, 0.18)",
			chip: "rgba(76, 113, 73, 0.82)",
			chipText: "#fffaf2"
		},
		assets: [
			{ x: "8%", y: "16%", size: "42px", label: "petal pal", shortLabel: "PP", kind: "flower", motion: "sway" },
			{ x: "81%", y: "12%", size: "38px", label: "lantern", shortLabel: "LT", kind: "badge", motion: "bob" },
			{ x: "15%", y: "79%", size: "44px", label: "sprite", shortLabel: "SP", kind: "star", motion: "float" },
			{ x: "83%", y: "69%", size: "40px", label: "moss bot", shortLabel: "MB", kind: "bot", motion: "drift" }
		]
	},
	"superhero-city": {
		id: "superhero-city",
		label: "Superhero City",
		pattern: "skyline",
		celebration: "bursts",
		colors: {
			bgPrimary: "rgba(19, 41, 88, 0.82)",
			bgSecondary: "rgba(252, 92, 118, 0.22)",
			glow: "rgba(255, 225, 117, 0.2)",
			accent: "#ffd76b",
			accentSoft: "rgba(255, 215, 107, 0.24)",
			edge: "rgba(255, 123, 149, 0.32)",
			pattern: "rgba(138, 184, 255, 0.2)",
			chip: "rgba(31, 57, 112, 0.82)",
			chipText: "#fff7ea"
		},
		assets: [
			{ x: "10%", y: "13%", size: "44px", label: "cape kid", shortLabel: "CK", kind: "badge", motion: "float" },
			{ x: "79%", y: "12%", size: "40px", label: "city bot", shortLabel: "CB", kind: "tower", motion: "bob" },
			{ x: "14%", y: "76%", size: "42px", label: "signal", shortLabel: "SG", kind: "star", motion: "orbit" },
			{ x: "83%", y: "72%", size: "38px", label: "zoom car", shortLabel: "ZC", kind: "capsule", motion: "drift" }
		]
	},
	"dinosaur-land": {
		id: "dinosaur-land",
		label: "Dinosaur Land",
		pattern: "tracks",
		celebration: "confetti",
		colors: {
			bgPrimary: "rgba(78, 61, 21, 0.8)",
			bgSecondary: "rgba(143, 205, 94, 0.24)",
			glow: "rgba(255, 225, 136, 0.2)",
			accent: "#ffd57c",
			accentSoft: "rgba(255, 213, 124, 0.22)",
			edge: "rgba(194, 242, 128, 0.32)",
			pattern: "rgba(220, 233, 171, 0.18)",
			chip: "rgba(92, 72, 26, 0.82)",
			chipText: "#fff8ea"
		},
		assets: [
			{ x: "9%", y: "15%", size: "46px", label: "rex pal", shortLabel: "RX", kind: "bot", motion: "bob" },
			{ x: "80%", y: "11%", size: "40px", label: "bone map", shortLabel: "BM", kind: "badge", motion: "drift" },
			{ x: "15%", y: "78%", size: "42px", label: "trail egg", shortLabel: "TE", kind: "egg", motion: "float" },
			{ x: "82%", y: "70%", size: "38px", label: "fern jeep", shortLabel: "FJ", kind: "leaf", motion: "sway" }
		]
	},
	"pirate-voyage": {
		id: "pirate-voyage",
		label: "Pirate Voyage",
		pattern: "map-lines",
		celebration: "bursts",
		colors: {
			bgPrimary: "rgba(18, 64, 98, 0.8)",
			bgSecondary: "rgba(255, 179, 78, 0.22)",
			glow: "rgba(128, 224, 255, 0.2)",
			accent: "#ffc86a",
			accentSoft: "rgba(255, 200, 106, 0.24)",
			edge: "rgba(130, 224, 255, 0.34)",
			pattern: "rgba(255, 221, 172, 0.18)",
			chip: "rgba(27, 77, 118, 0.82)",
			chipText: "#fff8ec"
		},
		assets: [
			{ x: "8%", y: "12%", size: "44px", label: "ship", shortLabel: "SH", kind: "capsule", motion: "bob" },
			{ x: "81%", y: "14%", size: "38px", label: "parrot pal", shortLabel: "PP", kind: "badge", motion: "float" },
			{ x: "14%", y: "77%", size: "42px", label: "treasure", shortLabel: "TR", kind: "star", motion: "drift" },
			{ x: "84%", y: "72%", size: "40px", label: "map bot", shortLabel: "MB", kind: "bot", motion: "orbit" }
		]
	},
	"outer-wild-west": {
		id: "outer-wild-west",
		label: "Outer Wild West",
		pattern: "canyons",
		celebration: "dust",
		colors: {
			bgPrimary: "rgba(95, 54, 23, 0.8)",
			bgSecondary: "rgba(255, 163, 102, 0.22)",
			glow: "rgba(255, 220, 145, 0.2)",
			accent: "#ffd287",
			accentSoft: "rgba(255, 210, 135, 0.24)",
			edge: "rgba(255, 190, 122, 0.34)",
			pattern: "rgba(255, 220, 170, 0.18)",
			chip: "rgba(112, 67, 31, 0.82)",
			chipText: "#fff8ef"
		},
		assets: [
			{ x: "9%", y: "14%", size: "42px", label: "star rider", shortLabel: "SR", kind: "star", motion: "bob" },
			{ x: "79%", y: "11%", size: "40px", label: "trail bot", shortLabel: "TB", kind: "bot", motion: "drift" },
			{ x: "13%", y: "79%", size: "44px", label: "canyon map", shortLabel: "CM", kind: "badge", motion: "float" },
			{ x: "84%", y: "69%", size: "38px", label: "rover", shortLabel: "RV", kind: "capsule", motion: "orbit" }
		]
	},
	"enchanted-robots": {
		id: "enchanted-robots",
		label: "Enchanted Robots",
		pattern: "circuits",
		celebration: "pixels",
		colors: {
			bgPrimary: "rgba(22, 57, 74, 0.8)",
			bgSecondary: "rgba(122, 247, 216, 0.22)",
			glow: "rgba(160, 233, 255, 0.2)",
			accent: "#9af3d5",
			accentSoft: "rgba(154, 243, 213, 0.24)",
			edge: "rgba(173, 241, 255, 0.34)",
			pattern: "rgba(145, 250, 229, 0.18)",
			chip: "rgba(28, 76, 92, 0.82)",
			chipText: "#effffb"
		},
		assets: [
			{ x: "10%", y: "12%", size: "46px", label: "gear pixie", shortLabel: "GP", kind: "bot", motion: "orbit" },
			{ x: "80%", y: "13%", size: "38px", label: "glow wand", shortLabel: "GW", kind: "star", motion: "float" },
			{ x: "14%", y: "77%", size: "42px", label: "helper orb", shortLabel: "HO", kind: "planet", motion: "bob" },
			{ x: "83%", y: "71%", size: "40px", label: "kit station", shortLabel: "KS", kind: "tower", motion: "drift" }
		]
	}
};

const FALLBACK_THEME_LIBRARY = {
	"calm-clinic": {
		id: "calm-clinic",
		label: "Calm Clinic",
		pattern: "calm-grid",
		celebration: "soft-glow",
		colors: {
			bgPrimary: "rgba(8, 30, 56, 0.78)",
			bgSecondary: "rgba(110, 160, 196, 0.18)",
			glow: "rgba(177, 215, 235, 0.16)",
			accent: "#b8d9e5",
			accentSoft: "rgba(184, 217, 229, 0.18)",
			edge: "rgba(213, 236, 246, 0.24)",
			pattern: "rgba(210, 232, 241, 0.14)",
			chip: "rgba(16, 49, 74, 0.78)",
			chipText: "#edf7fb"
		},
		assets: [
			{ x: "12%", y: "16%", size: "34px", label: "focus", shortLabel: "FC", kind: "badge", motion: "drift" },
			{ x: "80%", y: "16%", size: "30px", label: "path", shortLabel: "PT", kind: "capsule", motion: "float" },
			{ x: "16%", y: "78%", size: "32px", label: "steady", shortLabel: "ST", kind: "star", motion: "bob" },
			{ x: "80%", y: "74%", size: "30px", label: "guide", shortLabel: "GD", kind: "leaf", motion: "drift" }
		]
	}
};

const AGE_THEME_CURATION = {
	infant: ["fairy-garden", "underwater-adventure", "magical-kingdom", "space-explorers", "enchanted-robots"],
	toddler: ["underwater-adventure", "jungle-safari", "fairy-garden", "dinosaur-land", "space-explorers", "magical-kingdom"],
	primary: Object.keys(SELECTABLE_THEME_LIBRARY),
	mixed: ["space-explorers", "superhero-city", "dinosaur-land", "pirate-voyage", "outer-wild-west", "enchanted-robots"],
	adult: []
};

const DEFAULT_THEME_BY_AGE = {
	infant: "fairy-garden",
	toddler: "underwater-adventure",
	primary: "magical-kingdom",
	mixed: "space-explorers",
	adult: "calm-clinic"
};

export function getOverlayThemeById(themeId) {
	return SELECTABLE_THEME_LIBRARY[themeId] || FALLBACK_THEME_LIBRARY[themeId] || null;
}

export function getOverlayThemeOptions(ageGroup = "adult") {
	const safeAgeGroup = Object.prototype.hasOwnProperty.call(AGE_THEME_CURATION, ageGroup) ? ageGroup : "adult";

	return (AGE_THEME_CURATION[safeAgeGroup] || [])
		.map((themeId) => SELECTABLE_THEME_LIBRARY[themeId])
		.filter(Boolean);
}

export function getDefaultOverlayThemeId(ageGroup = "adult") {
	return DEFAULT_THEME_BY_AGE[ageGroup] || DEFAULT_THEME_BY_AGE.adult;
}

export function isOverlayThemeSelectable(ageGroup = "adult", themeId) {
	if (!themeId || themeId === OVERLAY_THEME_AUTO) {
		return true;
	}

	return getOverlayThemeOptions(ageGroup).some((theme) => theme.id === themeId);
}

export function resolveOverlayTheme({ ageGroup = "adult", themeId = OVERLAY_THEME_AUTO } = {}) {
	const safeAgeGroup = Object.prototype.hasOwnProperty.call(AGE_THEME_CURATION, ageGroup) ? ageGroup : "adult";

	if (safeAgeGroup === "adult") {
		return getOverlayThemeById(DEFAULT_THEME_BY_AGE.adult);
	}

	const selectedTheme = themeId !== OVERLAY_THEME_AUTO && isOverlayThemeSelectable(safeAgeGroup, themeId)
		? getOverlayThemeById(themeId)
		: null;

	return selectedTheme || getOverlayThemeById(getDefaultOverlayThemeId(safeAgeGroup));
}
