
# rF2 Replay

![GitHub](https://img.shields.io/github/license/bornabesic/rf2replay?style=flat-square)

Visualize lap data directly from [rFactor 2](https://store.steampowered.com/app/365960/rFactor_2/) replay (.Vcr) files

### [Changelog](CHANGELOG.md)

### Features
- Client-side replay file processing and visualization
- Throttle and brake telemetry comparison

### Setup
```sh
npm install
```

### Local development

```sh
npm run dev
```

```sh
npm run prod
```

### Building for production

```sh
npm run build
```

Static files are available in `dist/` afterwards.

### Contributing

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag `enhancement`. Don't forget to give the project a star! Thanks again!

1. Fork the project
2. Create your branch (`git checkout -b dev-awesome-feature`)
3. Commit your changes (`git commit -m 'Add the best feature ever'`)
4. Push to the branch (`git push origin dev-awesome-feature`)
5. Open a pull request

### Known Issues
- Firefox does not yet support import statements in web workers (see [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#browser_compatibility))
    - `npm run dev` does not work, use `npm run prod` instead for developing

### Acknowledgments
- [lordp/rFactor2-VCR-format](https://github.com/lordp/rFactor2-VCR-format)
- [Gerald Jacobson's RF2 VCR Replay Format Wiki](https://rf2-vcr-replay-format.fandom.com/wiki/RF2_VCR_Replay_Format_Wiki)

### License
Copyright © 2023  Borna Bešić  
[GNU GPLv3](LICENSE.txt)
