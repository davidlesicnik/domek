import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Domek",
    short_name: "Domek",
    description: "Calm home board for shared planning, lists, chores, and notes.",
    start_url: "/en",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: "#f9fafb",
    theme_color: "#4f8a5b",
    icons: [
      {
        src: "/icon.png",
        sizes: "427x426",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "427x426",
        type: "image/png",
        purpose: "maskable",
      },
    ],

    shortcuts: [
      {
        name: "Home board",
        short_name: "Board",
        description: "Open your household home board",
        url: "/en",
      },
      {
        name: "Shopping",
        short_name: "Shop",
        description: "Open shopping lists",
        url: "/en/app/shopping",
      },
      {
        name: "Chores",
        short_name: "Chores",
        description: "Open household chores",
        url: "/en/app/chores",
      },
    ],
    categories: ["productivity", "lifestyle", "utilities"],
  };
}
