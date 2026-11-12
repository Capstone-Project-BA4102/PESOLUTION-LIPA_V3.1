/**
 * Print the page as it is rendered, naming the file through the document title.
 * The title is restored once the browser dialog has settled, since Chrome and
 * Firefox keep reading it while building the PDF.
 */
export function printDocument(title: string): void {
  const original = document.title
  document.title = title
  window.print()
  setTimeout(() => { document.title = original }, 500)
}
