import { createElement, House, Grid3X3, Moon, Search } from "lucide";

const icons = { house: House, grid: Grid3X3, moon: Moon, search: Search };

for (const placeholder of document.querySelectorAll("[data-icon]")) {
  placeholder.replaceWith(
    createElement(icons[placeholder.dataset.icon], {
      class: "icon",
      "stroke-width": 1.8,
      "aria-hidden": "true",
      focusable: "false",
    }),
  );
}
