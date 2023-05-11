

import "carbon-components-svelte/css/all.css";
import "./app.css"

import App from "./App.svelte"

const app = new App({
  target: document.getElementById('app')
})

const overrides = {
  "--cds-interactive-01": "#da1e28",
  "--cds-interactive-04": "#da1e28",
  "--cds-hover-primary": "#b81921",
  "--cds-active-primary": "#750e13",
  "--cds-ui-background": "#262626",
  "--cds-text-01": "#f4f4f4",
  "--cds-focus": "#da1e28"
}

for (const prop in overrides)
  document.documentElement.style.setProperty(prop, overrides[prop]);

export default app
