// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findElements(value: string): void {
  if (!value) {
    const elements = document.querySelectorAll<HTMLDivElement>("[data-search]");

    elements.forEach((element, index) => {
      if (index <= 2) {
        element.style.display = "flex";
      } else {
        element.style.display = "none";
      }
    });
    return;
  }

  const searchWords = value
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 0);

  const elements = document.querySelectorAll<HTMLElement>("[data-search]");

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];

    const searchString = element.getAttribute("data-search")?.toLowerCase();

    if (searchString && searchWords.some((word) => searchString.includes(word))) {
      element.style.display = "flex";
    } else {
      element.style.display = "none";
    }
  }
}

document
  .getElementById("searchInput")
  ?.addEventListener("input", (e) => findElements((e.target as HTMLInputElement).value ?? ""));

document.getElementById("searchBar")?.addEventListener("close", () => {
  const elements = document.querySelectorAll<HTMLDivElement>("[data-search]");

  elements.forEach((element) => {
    element.style.display = "none";
  });
});
