import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 포스터의 진홍에서 가져온 빨강. 600이 기본 버튼색(흰 글자 대비 5.4:1).
        brand: {
          50: "#FFF2F2",
          100: "#FFE1E2",
          200: "#FFC5C8",
          600: "#D3121D",
          700: "#A80E17",
          800: "#7D0B12",
          900: "#4A070B",
        },
        ink: {
          DEFAULT: "#1E1E1E",
          2: "#555555",
          3: "#737373",
          4: "#B5B5B5",
        },
        line: {
          DEFAULT: "#E6E6E6",
          strong: "#CFCFCF",
        },
        surface: "#F6F6F6",
        ok: {
          50: "#EAF7F1",
          600: "#12805C",
        },
        wait: {
          50: "#FFF5E6",
          700: "#A2550A",
        },
        kakao: "#FEE500",
      },
      fontFamily: {
        display: ["var(--font-display)", '"Noto Serif KR"', '"AppleMyungjo"', "serif"],
        sans: [
          '"Pretendard Variable"',
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          "sans-serif",
        ],
      },
      fontSize: {
        // 12 / 13 / 14 / 16 / 18 / 22 / 28 / 34
        cap: ["12px", { lineHeight: "18px" }],
        meta: ["13px", { lineHeight: "20px" }],
        ui: ["14px", { lineHeight: "22px" }],
        body: ["16px", { lineHeight: "26px" }],
        lead: ["18px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        h2: ["22px", { lineHeight: "30px", letterSpacing: "-0.02em" }],
        h1: ["28px", { lineHeight: "36px", letterSpacing: "-0.025em" }],
        hero: ["34px", { lineHeight: "42px", letterSpacing: "-0.03em" }],
      },
      maxWidth: {
        page: "1120px",
      },
    },
  },
  plugins: [],
};

export default config;
