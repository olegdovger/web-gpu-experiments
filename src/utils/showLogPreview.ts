export default function showLogPreview(text: string) {
  const element = document.querySelector("#preview-log");

  if (!element) return;

  element.textContent = text;

  element.style.display = "initial";
}
