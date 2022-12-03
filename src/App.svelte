<script lang="ts">
  import FilePicker from "./lib/FilePicker.svelte";

  // NOTE Firefox does not support import statements in web workers so it only works in the production build
  // https://github.com/vitejs/vite/issues/4586
  import MainWorker from "./worker?worker";
  import { setContext } from "svelte";

  let worker = new MainWorker();
  setContext("worker", worker);

  function onFileLoaded(event: CustomEvent<Uint8Array>) {
    const data = event.detail;
    console.log("Data size: " + data.length);
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
