export default function showLogPreview(text: string) {
  const element: HTMLDivElement | null = document.querySelector("#preview-log");

  if (!element) return;

  element.textContent = text;

  element.style.display = "initial";
}
