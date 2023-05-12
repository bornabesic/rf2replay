/*
    rF2 Replay
    Copyright (C) 2023  Borna Bešić

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

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
