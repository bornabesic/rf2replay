<script lang="ts">
  import FilePicker from "./lib/FilePicker.svelte";
  import { Replay, ReplayEventType, Telemetry } from "./Replay";

  // NOTE Firefox does not support import statements in web workers so it only works in the production build
  // https://github.com/vitejs/vite/issues/4586
  import MainWorker from "./worker?worker";
  import { setContext } from "svelte";

  let worker = new MainWorker();
  setContext("worker", worker);

  let replay: Replay = null;

  function onFileLoaded(event: CustomEvent<Uint8Array>) {
    const data = event.detail;
    replay = new Replay(data);
    console.log("Replay version: " + replay.version);
    console.log(replay.drivers);
  }
</script>

<main>
  <FilePicker on:fileLoaded={onFileLoaded} />
</main>

<style>
  main {
    color: red;
  }
</style>
