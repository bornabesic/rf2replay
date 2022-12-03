<script lang="ts">
  import FilePicker from "./lib/FilePicker.svelte";

  function onFileLoaded(event: CustomEvent<ArrayBuffer>) {
    const data = event.detail;
    console.log("Data:" + data);
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
