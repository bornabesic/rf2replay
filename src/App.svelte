<script lang="ts">
  import FilePicker from "./lib/FilePicker.svelte";
  import { Checkpoint, Replay, ReplayEventType, Telemetry } from "./Replay";

  // NOTE Firefox does not support import statements in web workers so it only works in the production build
  // https://github.com/vitejs/vite/issues/4586
  import MainWorker from "./worker?worker";
  import { setContext } from "svelte";

  let worker = new MainWorker();
  setContext("worker", worker);

  let replay: Replay = null;

  function onFileLoaded(event: CustomEvent<Uint8Array>) {
    const data = event.detail;
    try {
      replay = new Replay(data);
    } catch (error) {
      alert(error);
      return;
    }

    for (let event of replay) {
      if (event.type === ReplayEventType.TELEMETRY) {
        const telemetry: Telemetry = event.data;
      } else if (event.type === ReplayEventType.CHECKPOINT) {
        const checkpoint: Checkpoint = event.data;
      }
    }
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
