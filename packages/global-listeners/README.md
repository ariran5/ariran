# `global-listeners`

> TODO: description

## Usage

```js
import { clickOutside, keyupEsc } from "@ariran/global-listeners";

const el = document.querySelector(".element");
clickOutside(el, () => {
  console.log("clicked");
});

keyupEsc(() => {
  console.log("esc");
});
```
