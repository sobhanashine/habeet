import type { MetadataRoute } from "next";

export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "هبیت — هر روز، کمی آزادتر",
    short_name: "هبیت",
    description: "دفتر کوچک تو برای کنار گذاشتن عادت‌ها",
    start_url: "/",
    scope: "/",
    lang: "fa",
    dir: "rtl",
    display: "standalone",
    background_color: "#f7f9f7",
    theme_color: "#f7f9f7",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
