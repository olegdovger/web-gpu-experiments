// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findElements(value: string): void {
  const searchWords = value
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 2);
  const elements = document.querySelectorAll(".search-item");

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i] as HTMLElement;

    if (!element) continue;
    const searchString = element.getAttribute("data-search")?.toLowerCase();

    if (searchWords.some((word) => searchString?.includes(word))) {
      element.style.display = "flex";
    } else {
      element.style.display = "none";
    }
  }
}

document
  .getElementById("searchInput")
  ?.addEventListener("input", (e) =>
    findElements((e.target as HTMLInputElement).value ?? ""),
  );
