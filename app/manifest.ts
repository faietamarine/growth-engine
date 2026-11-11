import type { MetadataRoute } from "next";

/* Installazione su telefono e PC ("Aggiungi alla schermata Home"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nautica Growth Engine",
    short_name: "Growth Engine",
    description: "Campagne e lead per Faieta Marine",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0F2340",
    theme_color: "#0F2340",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
