<script lang="ts">
  import FilePicker from "./lib/FilePicker.svelte";

  function onFileLoaded(event: CustomEvent<Uint8Array>) {
    const data = event.detail;
    console.log("Data: " + data.length);
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
