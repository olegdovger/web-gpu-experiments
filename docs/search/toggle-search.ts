let cltlMetaPressed = false;

document.addEventListener(
  "keydown",
  (event) => {
    const keyName = event.key;
    const metaKey = event.metaKey;
    const ctrlKey = event.ctrlKey;

    if (keyName.toLowerCase() === "k") {
      if (cltlMetaPressed) {
        (
          document.getElementById("searchBar") as HTMLDialogElement
        )?.showModal();
      }
    }

    if (metaKey || ctrlKey) {
      cltlMetaPressed = true;
    }
  },
  false,
);

document.addEventListener(
  "keyup",
  (event) => {
    const metaKey = event.metaKey;
    const ctrlKey = event.ctrlKey;

    if (metaKey || ctrlKey) {
      cltlMetaPressed = false;
    }
  },
  false,
);
